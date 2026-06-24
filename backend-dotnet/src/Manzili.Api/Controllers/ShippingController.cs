using Manzili.Api.Common;
using Manzili.Application.Integrations;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// Port of Node routes/shipping.routes.js + controllers/shipping.controller.js. The Node
/// router is mounted under BOTH "/bosta" and "/shipping" (routes/index.js), so every action
/// is exposed under both prefixes. All endpoints require authentication.
/// </summary>
[Authorize]
public sealed class ShippingController : ApiController
{
    private readonly ShippingService _shipping;

    public ShippingController(ShippingService shipping)
    {
        _shipping = shipping;
    }

    // GET /api/v1/bosta/cities  and  GET /api/v1/shipping/cities
    [HttpGet("api/v1/bosta/cities")]
    [HttpGet("api/v1/shipping/cities")]
    public async Task<IActionResult> ListCities(CancellationToken ct)
    {
        var data = await _shipping.ListCitiesAsync(ct);
        return ApiOk(data);
    }

    // GET /api/v1/bosta/cities/{cityId}/zones  and  /api/v1/shipping/cities/{cityId}/zones
    [HttpGet("api/v1/bosta/cities/{cityId}/zones")]
    [HttpGet("api/v1/shipping/cities/{cityId}/zones")]
    public async Task<IActionResult> ListZones(string cityId, CancellationToken ct)
    {
        var data = await _shipping.ListZonesAsync(cityId, ct);
        return ApiOk(data);
    }

    // GET /api/v1/bosta/cities/{cityId}/districts  and  /api/v1/shipping/cities/{cityId}/districts
    [HttpGet("api/v1/bosta/cities/{cityId}/districts")]
    [HttpGet("api/v1/shipping/cities/{cityId}/districts")]
    public async Task<IActionResult> ListDistricts(string cityId, CancellationToken ct)
    {
        var data = await _shipping.ListDistrictsAsync(cityId, ct);
        return ApiOk(data);
    }

    // POST /api/v1/shipping/estimate  and  POST /api/v1/bosta/estimate
    // Public: the product page shows an "estimated delivery" range to guests too.
    [AllowAnonymous]
    [HttpPost("api/v1/shipping/estimate")]
    [HttpPost("api/v1/bosta/estimate")]
    public async Task<IActionResult> Estimate([FromBody] ShippingEstimateRequest? req)
    {
        var data = await _shipping.EstimateAsync(req ?? new ShippingEstimateRequest());
        return ApiOk(data);
    }
}
