using Manzili.Application.Configuration;
using Manzili.Application.Integrations;
using Manzili.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Single source of truth for cart money math (subtotal, per-seller Bosta shipping, the buyer's
/// 25% shipping share, Stripe fee, Manzili commission, totals). Used by the /checkout/quote
/// endpoint so the UI displays exactly what /checkout will charge.
/// </summary>
public sealed class CheckoutPricingService
{
    private readonly ManziliDbContext _db;
    private readonly FeesOptions _fees;

    public CheckoutPricingService(ManziliDbContext db, IOptions<AppOptions> options)
    {
        _db = db;
        _fees = options.Value.Fees;
    }

    public FeesOptions Fees => _fees;

    /// <summary>Compute the breakdown for a cart. Groups by seller to count shippable stores.</summary>
    public async Task<CheckoutBreakdown> QuoteAsync(
        IReadOnlyList<CheckoutItem> items, decimal discount, string paymentMethod, bool custom = false)
    {
        var productIds = (items ?? new List<CheckoutItem>())
            .Select(i => int.TryParse(i.ProductId, out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();

        var products = await _db.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Productid))
            .Select(p => new { p.Productid, p.Price, p.Sellerid })
            .ToListAsync();
        var map = products.ToDictionary(p => p.Productid);

        decimal subtotal = 0m;
        var sellers = new HashSet<int>();
        foreach (var item in items ?? new List<CheckoutItem>())
        {
            if (!int.TryParse(item.ProductId, out var pid) || !map.TryGetValue(pid, out var p)) continue;
            var unit = (p.Price ?? 0m) != 0m ? p.Price!.Value : (item.Price ?? 0m);
            subtotal += unit * item.Quantity;
            sellers.Add(p.Sellerid ?? 0);
        }

        var stores = sellers.Count > 0 ? sellers.Count : (items is { Count: > 0 } ? 1 : 0);
        return BuildBreakdown(subtotal, discount, stores, paymentMethod, custom);
    }

    /// <summary>Assemble a breakdown from already-computed subtotal + store count.</summary>
    public CheckoutBreakdown BuildBreakdown(decimal subtotal, decimal discount, int stores, string paymentMethod, bool custom)
    {
        var shipping = stores * _fees.DefaultShipping;
        var buyerShip = _fees.BuyerShip(shipping);
        var sellerShip = _fees.SellerShip(shipping);
        var goods = Math.Max(0m, subtotal - discount);
        var isStripe = string.Equals(paymentMethod, "STRIPE", StringComparison.OrdinalIgnoreCase);
        var stripeFee = isStripe ? _fees.StripeFee(goods + buyerShip) : 0m;
        var commission = _fees.Commission(subtotal, custom);

        return new CheckoutBreakdown
        {
            Subtotal = subtotal,
            Discount = discount,
            Shipping = shipping,
            BuyerShippingShare = buyerShip,
            SellerShippingShare = sellerShip,
            StripeFee = stripeFee,
            Commission = commission,
            Total = Math.Round(goods + buyerShip + stripeFee, 2, MidpointRounding.AwayFromZero),
            SellerNet = Math.Round(subtotal - commission - sellerShip, 2, MidpointRounding.AwayFromZero),
            Stores = stores,
        };
    }
}
