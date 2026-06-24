using System.Text.Json;
using Manzili.Application.Integrations;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of Node services/shipping.service.js: proxies city/zone/district lookups to Bosta, and
/// computes a shipping estimate that depends on PACKAGE SIZE and the DISTANCE between the seller's
/// pickup city and the buyer's drop-off city (via <see cref="ShippingPricingService"/>).
/// </summary>
public sealed class ShippingService
{
    private readonly BostaClient _bosta;
    private readonly ManziliDbContext _db;
    private readonly ShippingPricingService _pricing;

    public ShippingService(BostaClient bosta, ManziliDbContext db, ShippingPricingService pricing)
    {
        _bosta = bosta;
        _db = db;
        _pricing = pricing;
    }

    public Task<JsonElement?> ListCitiesAsync(CancellationToken ct = default) =>
        _bosta.GetAsync("cities", ct);

    public Task<JsonElement?> ListZonesAsync(string cityId, CancellationToken ct = default) =>
        _bosta.GetAsync($"cities/{cityId}/zones", ct);

    public Task<JsonElement?> ListDistrictsAsync(string cityId, CancellationToken ct = default) =>
        _bosta.GetAsync($"cities/{cityId}/districts", ct);

    /// <summary>
    /// Estimate the Bosta delivery fee. With items, prices each seller→buyer leg by the parcel's
    /// size and the seller-city→drop-off-city distance, summed. With a bare size (no items), returns
    /// a size-only range across distance tiers ("varies by the seller's location").
    /// </summary>
    public async Task<ShippingEstimateResult> EstimateAsync(ShippingEstimateRequest req)
    {
        var items = req?.Items ?? new List<ShippingEstimateItem>();

        // Size-only mode (custom-order estimate before a seller/buyer is known).
        if (!string.IsNullOrWhiteSpace(req?.Size) && items.Count == 0)
        {
            var q = _pricing.QuoteBySize(req!.Size, req.Bulky);
            return new ShippingEstimateResult
            {
                EstimatedShipping = q.Point, Low = q.Low, High = q.High, Currency = "EGP", Tier = q.Tier,
            };
        }

        var ids = items.Select(i => int.TryParse(i.ProductId, out var id) ? id : 0)
            .Where(id => id > 0).Distinct().ToList();
        var products = await _db.Products.AsNoTracking()
            .Include(p => p.Seller).ThenInclude(s => s!.StorePickupAddresses)
            .Where(p => ids.Contains(p.Productid))
            .ToListAsync();
        var map = products.ToDictionary(p => p.Productid);

        // One Bosta parcel per seller — collect each seller's item sizes + pickup city.
        var perSeller = new Dictionary<int, List<(string?, string?)>>();
        var sellerCity = new Dictionary<int, (string? City, string? BostaCityId)>();
        foreach (var it in items)
        {
            if (!int.TryParse(it.ProductId, out var pid) || !map.TryGetValue(pid, out var p)) continue;
            var sid = p.Sellerid ?? 0;
            if (!perSeller.TryGetValue(sid, out var list))
            {
                list = new List<(string?, string?)>();
                perSeller[sid] = list;
                sellerCity[sid] = SellerCity(p.Seller);
            }
            list.Add((p.ShippingSize, p.ShippingBulkyCategory));
        }

        if (perSeller.Count == 0)
        {
            var q = _pricing.QuoteBySize("MEDIUM", "NORMAL");
            return new ShippingEstimateResult
            {
                EstimatedShipping = q.Point, Low = q.Low, High = q.High, Currency = "EGP", Tier = "range",
            };
        }

        decimal point = 0m, low = 0m, high = 0m;
        var allSameCity = true;
        var anyKnown = false;
        foreach (var (sid, sizes) in perSeller)
        {
            var (size, bulky) = ShippingPricingService.Aggregate(sizes);
            var (city, bostaId) = sellerCity[sid];
            var leg = _pricing.QuoteLeg(city, bostaId, req?.DropOffCity, req?.DropOffBostaCityId, size, bulky);
            point += leg.Point;
            low += leg.Low;
            high += leg.High;
            if (leg.Tier != "sameCity") allSameCity = false;
            if (leg.Tier != "unknown") anyKnown = true;
        }

        return new ShippingEstimateResult
        {
            EstimatedShipping = point,
            Low = low,
            High = high,
            Currency = "EGP",
            Tier = anyKnown ? (allSameCity ? "sameCity" : "mixed") : "unknown",
            SameCity = allSameCity && anyKnown,
        };
    }

    private static (string? City, string? BostaCityId) SellerCity(Seller? s)
    {
        if (s == null) return (null, null);
        var w = s.StorePickupAddresses?.FirstOrDefault(x => x.IsDefault)
                ?? s.StorePickupAddresses?.FirstOrDefault();
        var city = w?.City;
        if (string.IsNullOrWhiteSpace(city)) city = s.AddressText;
        return (string.IsNullOrWhiteSpace(city) ? null : city, w?.BostaCityId);
    }
}
