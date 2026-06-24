using Manzili.Api.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/seller")]
[Authorize(Roles = "seller")]
public sealed class SellerController : ApiController
{
    private readonly SellerService _seller;
    private readonly WarehouseService _warehouses;
    private readonly PromotionService _promotions;

    public SellerController(SellerService seller, WarehouseService warehouses, PromotionService promotions)
    {
        _seller = seller;
        _warehouses = warehouses;
        _promotions = promotions;
    }

    // ----- Promotions (paid "feature my item") -----

    [HttpGet("promotions")]
    public async Task<IActionResult> ListPromotions()
    {
        var list = await _promotions.GetSellerActiveAsync(RequireSellerId);
        return ApiOk(new
        {
            promotions = list.Select(p => new
            {
                id = p.Promotionid.ToString(),
                productId = p.Productid.ToString(),
                plan = p.Plan,
                amount = p.Amount,
                expiresAt = p.ExpiresAt.ToString("yyyy-MM-ddTHH:mm:ss") + "Z",
            }),
        });
    }

    [HttpPost("promotions")]
    public async Task<IActionResult> CreatePromotion([FromBody] CreatePromotionRequest req)
    {
        if (!int.TryParse(req?.ProductId, out var pid))
            throw new Manzili.Application.Common.AppException("A valid productId is required", 400, "VALIDATION_ERROR");
        var p = await _promotions.CreateAsync(RequireSellerId, pid, req!.Plan);
        return ApiOk(new
        {
            id = p.Promotionid.ToString(),
            productId = p.Productid.ToString(),
            plan = p.Plan,
            amount = p.Amount,
            expiresAt = p.ExpiresAt.ToString("yyyy-MM-ddTHH:mm:ss") + "Z",
        }, statusCode: 201);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var data = await _seller.GetDashboardAsync(RequireSellerId);
        return ApiOk(data);
    }

    [HttpGet("products")]
    public async Task<IActionResult> ListProducts()
    {
        var result = await _seller.ListSellerProductsAsync(RequireSellerId);
        return ApiOk(
            new { products = result.Products },
            new Dictionary<string, object?> { ["total"] = result.Total });
    }

    [HttpGet("products/{id}")]
    public async Task<IActionResult> GetProduct(int id)
    {
        var data = await _seller.GetSellerProductAsync(RequireSellerId, id);
        return ApiOk(data);
    }

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest body)
    {
        var data = await _seller.CreateProductAsync(RequireSellerId, body);
        return ApiOk(data, statusCode: 201);
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductRequest body)
    {
        var data = await _seller.UpdateProductAsync(RequireSellerId, id, body);
        return ApiOk(data);
    }

    [HttpPatch("products/{id}/status")]
    public async Task<IActionResult> SetProductStatus(int id, [FromBody] SetProductStatusRequest body)
    {
        var data = await _seller.SetProductDisabledAsync(RequireSellerId, id, body.Disabled);
        return ApiOk(data);
    }

    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var message = await _seller.DeleteProductAsync(RequireSellerId, id);
        return ApiOk(null, new Dictionary<string, object?> { ["message"] = message });
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders()
    {
        var result = await _seller.GetSellerOrdersAsync(RequireSellerId);
        return ApiOk(
            new { orders = result.Orders },
            new Dictionary<string, object?> { ["total"] = result.Total });
    }

    [HttpPatch("orders/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest body)
    {
        var data = await _seller.UpdateOrderStatusAsync(RequireSellerId, id, body.Status);
        return ApiOk(data);
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var data = await _seller.GetSettingsAsync(RequireSellerId);
        return ApiOk(data);
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest body)
    {
        var data = await _seller.UpdateSettingsAsync(RequireSellerId, body);
        return ApiOk(data);
    }

    [HttpGet("custom-requests")]
    public async Task<IActionResult> ListCustomRequests()
    {
        var data = await _seller.ListSellerRequestsAsync(RequireSellerId);
        return ApiOk(data);
    }

    // ─── Warehouses (seller pickup locations) ──────────────────────────────────
    [HttpGet("warehouses")]
    public async Task<IActionResult> ListWarehouses()
    {
        var data = await _warehouses.ListAsync(RequireSellerId);
        return ApiOk(new { warehouses = data },
            new Dictionary<string, object?> { ["total"] = data.Count });
    }

    [HttpPost("warehouses")]
    public async Task<IActionResult> CreateWarehouse([FromBody] SaveWarehouseRequest body)
    {
        var data = await _warehouses.CreateAsync(RequireSellerId, body);
        return ApiOk(data, statusCode: 201);
    }

    [HttpPut("warehouses/{id}")]
    public async Task<IActionResult> UpdateWarehouse(int id, [FromBody] SaveWarehouseRequest body)
    {
        var data = await _warehouses.UpdateAsync(RequireSellerId, id, body);
        return ApiOk(data);
    }

    [HttpPost("warehouses/{id}/default")]
    public async Task<IActionResult> SetDefaultWarehouse(int id)
    {
        await _warehouses.SetDefaultAsync(RequireSellerId, id);
        return ApiOk(null, new Dictionary<string, object?> { ["message"] = "Default warehouse updated" });
    }

    [HttpDelete("warehouses/{id}")]
    public async Task<IActionResult> DeleteWarehouse(int id)
    {
        await _warehouses.DeleteAsync(RequireSellerId, id);
        return ApiOk(null, new Dictionary<string, object?> { ["message"] = "Warehouse removed" });
    }
}
