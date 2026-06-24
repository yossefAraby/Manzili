using Manzili.Application.Configuration;
using Manzili.Application.Integrations;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
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
    private readonly ShippingPricingService _ship;

    public CheckoutPricingService(ManziliDbContext db, IOptions<AppOptions> options, ShippingPricingService ship)
    {
        _db = db;
        _fees = options.Value.Fees;
        _ship = ship;
    }

    public FeesOptions Fees => _fees;

    /// <summary>Compute the breakdown for a cart. Shipping is priced per seller by package size
    /// and the distance from the seller's pickup city to the buyer's drop-off city (addressId).</summary>
    public async Task<CheckoutBreakdown> QuoteAsync(
        IReadOnlyList<CheckoutItem> items, decimal discount, string paymentMethod, bool custom = false, string? addressId = null)
    {
        var productIds = (items ?? new List<CheckoutItem>())
            .Select(i => int.TryParse(i.ProductId, out var id) ? id : 0)
            .Where(id => id > 0)
            .ToList();

        var products = await _db.Products.AsNoTracking()
            .Include(p => p.ProductVariants).ThenInclude(v => v.VariantOptions)
            .Include(p => p.Seller).ThenInclude(s => s!.StorePickupAddresses)
            .Where(p => productIds.Contains(p.Productid))
            .ToListAsync();
        var map = products.ToDictionary(p => p.Productid);

        // Buyer drop-off city for the distance tier (null until they pick a saved address).
        string? buyerCity = null, buyerBostaCityId = null;
        if (int.TryParse(addressId, out var aid))
        {
            var addr = await _db.Addresses.AsNoTracking().FirstOrDefaultAsync(a => a.Id == aid);
            buyerCity = addr?.City;
            buyerBostaCityId = addr?.BostaCityId;
        }

        decimal subtotal = 0m;
        // Per seller: collect item sizes (one Bosta parcel per seller) and the seller's pickup city.
        var perSellerSizes = new Dictionary<int, List<(string?, string?)>>();
        var sellerCity = new Dictionary<int, (string? City, string? BostaCityId)>();
        foreach (var item in items ?? new List<CheckoutItem>())
        {
            if (!int.TryParse(item.ProductId, out var pid) || !map.TryGetValue(pid, out var p)) continue;
            var baseUnit = (p.Price ?? 0m) != 0m ? p.Price!.Value
                : (p.Mrp ?? 0m) != 0m ? p.Mrp!.Value
                : (item.Price ?? 0m);
            var unit = baseUnit + VariantDelta(p, item.Variant);
            subtotal += unit * item.Quantity;
            var sid = p.Sellerid ?? 0;
            if (!perSellerSizes.TryGetValue(sid, out var list))
            {
                list = new List<(string?, string?)>();
                perSellerSizes[sid] = list;
                sellerCity[sid] = SellerCity(p.Seller);
            }
            list.Add((p.ShippingSize, p.ShippingBulkyCategory));
        }

        decimal shipping = 0m, shipLow = 0m, shipHigh = 0m;
        foreach (var (sid, sizes) in perSellerSizes)
        {
            var (size, bulky) = ShippingPricingService.Aggregate(sizes);
            var (city, bostaId) = sellerCity[sid];
            var leg = _ship.QuoteLeg(city, bostaId, buyerCity, buyerBostaCityId, size, bulky);
            shipping += leg.Point;
            shipLow += leg.Low;
            shipHigh += leg.High;
        }

        var stores = perSellerSizes.Count;
        var b = BuildBreakdown(subtotal, discount, stores, shipping, paymentMethod, custom);
        b.ShippingLow = Math.Round(shipLow, 2);
        b.ShippingHigh = Math.Round(shipHigh, 2);
        return b;
    }

    /// <summary>Assemble a breakdown from an already-computed subtotal + total shipping fee.</summary>
    public CheckoutBreakdown BuildBreakdown(decimal subtotal, decimal discount, int stores, decimal shipping, string paymentMethod, bool custom)
    {
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
            ShippingLow = shipping,
            ShippingHigh = shipping,
            BuyerShippingShare = buyerShip,
            SellerShippingShare = sellerShip,
            StripeFee = stripeFee,
            Commission = commission,
            Total = Math.Round(goods + buyerShip + stripeFee, 2, MidpointRounding.AwayFromZero),
            SellerNet = Math.Round(subtotal - commission - sellerShip, 2, MidpointRounding.AwayFromZero),
            Stores = stores,
        };
    }

    /// <summary>The seller's pickup city + Bosta city id (default warehouse, then free-text address).</summary>
    private static (string? City, string? BostaCityId) SellerCity(Seller? s)
    {
        if (s == null) return (null, null);
        var w = s.StorePickupAddresses?.FirstOrDefault(x => x.IsDefault)
                ?? s.StorePickupAddresses?.FirstOrDefault();
        var city = w?.City;
        if (string.IsNullOrWhiteSpace(city)) city = s.AddressText;
        return (string.IsNullOrWhiteSpace(city) ? null : city, w?.BostaCityId);
    }

    /// <summary>Sum of the selected variant options' price-deltas (same matching as OrderService).</summary>
    private static decimal VariantDelta(Product product, IReadOnlyDictionary<string, string>? variant)
    {
        if (variant is null || variant.Count == 0 || product.ProductVariants is null) return 0m;
        decimal sum = 0m;
        foreach (var (groupName, value) in variant)
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            var group = product.ProductVariants
                .FirstOrDefault(g => string.Equals(g.VariantName, groupName, StringComparison.OrdinalIgnoreCase));
            var opt = group?.VariantOptions
                .FirstOrDefault(o => string.Equals(o.Value, value, StringComparison.OrdinalIgnoreCase));
            if (opt is not null) sum += opt.PriceDelta;
        }
        return sum;
    }
}
