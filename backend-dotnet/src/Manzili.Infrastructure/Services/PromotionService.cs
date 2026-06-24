using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Paid product promotions. A seller pays Manzili to feature a product on the homepage:
/// <b>50 EGP / day</b> or <b>300 EGP / week</b>. Active promotions are featured in FIFO order; if more
/// than the home's featured slots are active, the extras simply wait their turn (a queue). The
/// homepage Featured section is filled from the active promotions first, then topped up with the most
/// popular products (so it's never empty and never under-filled).
/// </summary>
public sealed class PromotionService
{
    /// <summary>How many products the homepage Featured section shows.</summary>
    public const int FeaturedSlots = 8;

    private readonly ManziliDbContext _db;
    private readonly WalletService _wallet;

    public PromotionService(ManziliDbContext db, WalletService wallet)
    {
        _db = db;
        _wallet = wallet;
    }

    /// <summary>Plan catalog — the single source of truth for the plan name, price, and window.
    /// The gateway checkout (Kashier/Stripe) and the wallet path all derive the amount from here.</summary>
    public static (string plan, decimal amount, int days) ResolvePlan(string? plan) =>
        (plan ?? "").Trim().ToLowerInvariant() switch
        {
            "week" => ("week", 300m, 7),
            _ => ("day", 50m, 1),
        };

    /// <summary>The price of a plan (EGP) — used by the gateway checkout to charge the exact amount.</summary>
    public static decimal PlanAmount(string? plan) => ResolvePlan(plan).amount;

    /// <summary>
    /// Activates (or extends) a promotion that has ALREADY been paid for — whether from the wallet
    /// (paymentMethod=WALLET) or a gateway (KASHIER/STRIPE). Stacks onto any still-active window so
    /// re-buying extends rather than replaces. Idempotent on <paramref name="paymentRef"/> so a
    /// webhook + redirect double-confirm of the same gateway payment creates exactly one promotion.
    /// The Amount it records IS Manzili's revenue for this feature.
    /// </summary>
    public async Task<Promotion> ActivateAsync(int sellerId, int productId, string? plan, string paymentMethod, string? paymentRef)
    {
        // Exactly-once for gateway payments: if we already activated this payment, return that row.
        if (!string.IsNullOrWhiteSpace(paymentRef))
        {
            var existing = await _db.Promotions.AsNoTracking()
                .FirstOrDefaultAsync(x => x.PaymentRef == paymentRef);
            if (existing is not null) return existing;
        }

        var owns = await _db.Products.AsNoTracking()
            .AnyAsync(p => p.Productid == productId && p.Sellerid == sellerId);
        if (!owns) throw new NotFoundException("Product");

        var (planName, amount, days) = ResolvePlan(plan);
        var now = DateTime.UtcNow;

        // Stack onto any still-active promotion for this product so re-buying extends, not replaces.
        var activeExpiry = await _db.Promotions.AsNoTracking()
            .Where(x => x.Productid == productId && x.ExpiresAt > now)
            .MaxAsync(x => (DateTime?)x.ExpiresAt);
        var startFrom = activeExpiry is { } e && e > now ? e : now;

        var promo = new Promotion
        {
            Productid = productId,
            Sellerid = sellerId,
            Plan = planName,
            Amount = amount,
            PaymentMethod = paymentMethod,
            PaymentRef = paymentRef,
            CreatedAt = now,
            StartsAt = now,
            ExpiresAt = startFrom.AddDays(days),
        };
        _db.Promotions.Add(promo);
        await _db.SaveChangesAsync();
        return promo;
    }

    /// <summary>
    /// Buy a promotion paid from the seller's AVAILABLE wallet balance. Errors (402) if the balance
    /// can't cover it, so a wallet-paid feature is always real money moved to Manzili. For sellers
    /// whose earnings are still PENDING (not yet released), the UI also offers direct mobile-wallet /
    /// card payment via the gateway checkout.
    /// </summary>
    public async Task<Promotion> CreateFromWalletAsync(int sellerId, int productId, string? plan)
    {
        var (planName, amount, _) = ResolvePlan(plan);

        var wallet = await _wallet.EnsureWalletAsync(sellerId);
        if (wallet.AvailableBalance < amount)
            throw new AppException(
                $"Not enough available wallet balance to feature this product. The {planName} plan costs EGP {amount:0} "
                + $"but your available (withdrawable) balance is EGP {wallet.AvailableBalance:0}. "
                + "Earnings stay pending until an order is delivered — you can pay directly with mobile wallet or card instead.",
                402, "INSUFFICIENT_WALLET_BALANCE");

        var promo = await ActivateAsync(sellerId, productId, plan, "WALLET", paymentRef: null);

        // Debit the wallet (Manzili keeps it — platform revenue) now that the promotion exists.
        await _wallet.PostWalletTransactionAsync(
            sellerId, "PROMOTION_DEBIT", "AVAILABLE", -amount,
            idempotencyKey: $"promo-{promo.Promotionid}", storeOrderId: null);

        return promo;
    }

    /// <summary>Back-compat alias for the wallet-paid path (the original POST /seller/promotions).</summary>
    public Task<Promotion> CreateAsync(int sellerId, int productId, string? plan) =>
        CreateFromWalletAsync(sellerId, productId, plan);

    /// <summary>Total promotion revenue Manzili has earned (sum of every paid feature). Admin dashboard.</summary>
    public async Task<decimal> GetTotalRevenueAsync() =>
        await _db.Promotions.AsNoTracking().SumAsync(p => (decimal?)p.Amount) ?? 0m;

    /// <summary>The seller's currently-active promotions (newest first), for their dashboard.</summary>
    public async Task<List<Promotion>> GetSellerActiveAsync(int sellerId)
    {
        var now = DateTime.UtcNow;
        return await _db.Promotions.AsNoTracking()
            .Where(x => x.Sellerid == sellerId && x.ExpiresAt > now)
            .OrderByDescending(x => x.ExpiresAt)
            .ToListAsync();
    }

    /// <summary>
    /// Active promoted product ids in queue order (oldest purchase first). The homepage features the
    /// first <see cref="FeaturedSlots"/> of these; the rest are queued until a slot frees as earlier
    /// promotions expire.
    /// </summary>
    public async Task<List<int>> GetActivePromotedProductIdsAsync()
    {
        var now = DateTime.UtcNow;
        // Earliest still-active expiry per product = its place in the FIFO queue.
        return await _db.Promotions.AsNoTracking()
            .Where(x => x.ExpiresAt > now)
            .GroupBy(x => x.Productid)
            .Select(g => new { ProductId = g.Key, Since = g.Min(x => x.CreatedAt) })
            .OrderBy(x => x.Since)
            .Select(x => x.ProductId)
            .ToListAsync();
    }
}
