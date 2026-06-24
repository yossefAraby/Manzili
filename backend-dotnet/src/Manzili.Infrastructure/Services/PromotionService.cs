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

    private static (string plan, decimal amount, int days) ResolvePlan(string? plan) =>
        (plan ?? "").Trim().ToLowerInvariant() switch
        {
            "week" => ("week", 300m, 7),
            _ => ("day", 50m, 1),
        };

    /// <summary>
    /// Buy a promotion for one of the seller's products. If the product is already promoted, the
    /// window is EXTENDED (stacks onto the current expiry). The amount is recorded as the price the
    /// seller paid Manzili.
    /// </summary>
    public async Task<Promotion> CreateAsync(int sellerId, int productId, string? plan)
    {
        var owns = await _db.Products.AsNoTracking()
            .AnyAsync(p => p.Productid == productId && p.Sellerid == sellerId);
        if (!owns) throw new NotFoundException("Product");

        var (planName, amount, days) = ResolvePlan(plan);
        var now = DateTime.UtcNow;

        // Payment: charged from the seller's AVAILABLE wallet balance (this is them paying Manzili).
        // No balance → no promotion (errors), so a feature is always a real, paid-for placement.
        var wallet = await _wallet.EnsureWalletAsync(sellerId);
        if (wallet.AvailableBalance < amount)
            throw new AppException(
                $"Not enough wallet balance to feature this product. The {planName} plan costs EGP {amount:0} "
                + $"but your available balance is EGP {wallet.AvailableBalance:0}.",
                402, "INSUFFICIENT_WALLET_BALANCE");

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
            CreatedAt = now,
            StartsAt = now,
            ExpiresAt = startFrom.AddDays(days),
        };
        _db.Promotions.Add(promo);
        await _db.SaveChangesAsync();

        // Debit the wallet (Manzili keeps it — platform revenue) now that the promotion exists.
        await _wallet.PostWalletTransactionAsync(
            sellerId, "PROMOTION_DEBIT", "AVAILABLE", -amount,
            idempotencyKey: $"promo-{promo.Promotionid}", storeOrderId: null);

        return promo;
    }

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
