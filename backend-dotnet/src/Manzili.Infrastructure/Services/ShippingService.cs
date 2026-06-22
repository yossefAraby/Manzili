using System.Text.Json;
using Manzili.Application.Integrations;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of Node services/shipping.service.js: proxies city/zone/district lookups to Bosta
/// and computes a simple item-count-based shipping estimate.
/// </summary>
public sealed class ShippingService
{
    private readonly BostaClient _bosta;

    public ShippingService(BostaClient bosta)
    {
        _bosta = bosta;
    }

    public Task<JsonElement?> ListCitiesAsync(CancellationToken ct = default) =>
        _bosta.GetAsync("cities", ct);

    public Task<JsonElement?> ListZonesAsync(string cityId, CancellationToken ct = default) =>
        _bosta.GetAsync($"cities/{cityId}/zones", ct);

    public Task<JsonElement?> ListDistrictsAsync(string cityId, CancellationToken ct = default) =>
        _bosta.GetAsync($"cities/{cityId}/districts", ct);

    /// <summary>
    /// Node: baseRate 50 + (items.length - 1) * perItemRate 10. Uses the number of line
    /// items (not summed quantities), matching the JS implementation.
    /// </summary>
    public ShippingEstimateResult EstimateShipping(IReadOnlyList<ShippingEstimateItem> items)
    {
        const decimal baseRate = 50m;
        const decimal perItemRate = 10m;
        var total = baseRate + (items.Count - 1) * perItemRate;
        return new ShippingEstimateResult { EstimatedShipping = total, Currency = "EGP" };
    }
}
