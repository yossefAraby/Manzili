using Manzili.Api.Common;
using Manzili.Application.Admin;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/admin")]
[Authorize(Roles = "admin")]
public sealed class AdminController : ApiController
{
    private readonly AdminService _admin;

    public AdminController(AdminService admin)
    {
        _admin = admin;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _admin.GetStatsAsync();
        return ApiOk(stats);
    }

    // Manzili's own commission earnings (15% standard / 10% custom). Full admins only —
    // GetPlatformRevenueAsync enforces it, so a moderator gets 403.
    [HttpGet("revenue")]
    public async Task<IActionResult> GetRevenue()
        => ApiOk(await _admin.GetPlatformRevenueAsync(RequirePersonId));

    [HttpGet("orders")]
    public async Task<IActionResult> ListOrders([FromQuery] int? page, [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var result = await _admin.ListOrdersAsync(pg);
        return ApiOk(new { orders = result.Items }, Total(result.Total));
    }

    [HttpGet("products")]
    public async Task<IActionResult> ListProducts([FromQuery] int? page, [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var result = await _admin.ListProductsAsync(pg);
        return ApiOk(new { products = result.Items }, Total(result.Total));
    }

    // DANGER ZONE — full admins only (the service enforces it). Wipes the whole catalog + custom
    // items, or all non-admin users + their data, to reset a test environment.
    [HttpPost("maintenance/purge-items")]
    public async Task<IActionResult> PurgeAllItems()
        => ApiOk(await _admin.PurgeAllItemsAsync(RequirePersonId));

    [HttpPost("maintenance/purge-users")]
    public async Task<IActionResult> PurgeAllUsers()
        => ApiOk(await _admin.PurgeAllUsersAsync(RequirePersonId));

    [HttpPost("products")]
    public async Task<IActionResult> UpdateProduct([FromBody] AdminProductActionRequest body)
    {
        // Permanent hard-delete is gated to full admins (PurgeProductAsync enforces it);
        // moderators may only soft-disable via the normal actions below.
        if (string.Equals(body.Action, "purge", StringComparison.OrdinalIgnoreCase))
        {
            var purged = await _admin.PurgeProductAsync(RequirePersonId, body.ProductId);
            return ApiOk(purged);
        }

        await _admin.EnsureSectionAsync(RequirePersonId, "products");
        var result = await _admin.UpdateProductAsync(body);
        return ApiOk(result);
    }

    [HttpGet("stores")]
    public async Task<IActionResult> ListStores([FromQuery] string? status)
    {
        var stores = await _admin.ListStoresAsync(status);
        return ApiOk(stores);
    }

    [HttpPost("stores")]
    public async Task<IActionResult> UpdateStore([FromBody] AdminStoreActionRequest body)
    {
        await _admin.EnsureSectionAsync(RequirePersonId, "stores");
        var result = await _admin.UpdateStoreStatusAsync(body.StoreId, body);
        return ApiOk(result);
    }

    // POST /api/v1/admin/orders/{id}/status — admin forces a store-order transition (Bosta can't
    // reach a dev box, so an admin advances the order to keep the flow completable).
    [HttpPost("orders/{id}/status")]
    public async Task<IActionResult> ForceOrderStatus(string id, [FromBody] AdminOrderStatusRequest body)
    {
        var result = await _admin.ForceOrderStatusAsync(RequirePersonId, id, body.Status);
        return ApiOk(result);
    }

    // GET /api/v1/admin/returns — returns awaiting admin approval (PENDING_APPROVAL).
    [HttpGet("returns")]
    public async Task<IActionResult> ListPendingReturns()
    {
        var returns = await _admin.ListPendingReturnsAsync(RequirePersonId);
        return ApiOk(new { returns });
    }

    // POST /api/v1/admin/returns/{id}/approve — runs Bosta reverse pickup + refund + wallet reversal.
    [HttpPost("returns/{id}/approve")]
    public async Task<IActionResult> ApproveReturn(string id)
    {
        var result = await _admin.ApproveReturnAsync(RequirePersonId, id);
        return ApiOk(result);
    }

    // POST /api/v1/admin/returns/{id}/reject — mark rejected, no refund.
    [HttpPost("returns/{id}/reject")]
    public async Task<IActionResult> RejectReturn(string id, [FromBody] AdminRejectReturnRequest? body)
    {
        var result = await _admin.RejectReturnAsync(RequirePersonId, id, body?.Note);
        return ApiOk(result);
    }

    [HttpGet("reports")]
    public async Task<IActionResult> ListReports([FromQuery] int? page, [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var result = await _admin.ListReportsAsync(pg);
        return ApiOk(new { reports = result.Items }, Total(result.Total));
    }

    [HttpPost("reports/{id}/action")]
    public async Task<IActionResult> HandleReport(string id, [FromBody] AdminReportActionRequest body)
    {
        await _admin.EnsureSectionAsync(RequirePersonId, "reports");
        var result = await _admin.HandleReportAsync(id, body);
        return ApiOk(result);
    }

    [HttpGet("requests")]
    public async Task<IActionResult> ListRequests()
    {
        var requests = await _admin.ListRequestsAsync();
        return ApiOk(requests);
    }

    [HttpGet("coupons")]
    public async Task<IActionResult> ListCoupons()
    {
        var coupons = await _admin.ListCouponsAsync();
        return ApiOk(new { coupons });
    }

    [HttpPost("coupons")]
    public async Task<IActionResult> CreateCoupon([FromBody] AdminCreateCouponRequest body)
    {
        await _admin.EnsureSectionAsync(RequirePersonId, "coupons");
        var data = await _admin.CreateCouponAsync(RequirePersonId, body);
        return ApiOk(data, statusCode: 201);
    }

    [HttpDelete("coupons/{id}")]
    public async Task<IActionResult> DeleteCoupon(string id)
    {
        await _admin.EnsureSectionAsync(RequirePersonId, "coupons");
        var data = await _admin.DeleteCouponAsync(id);
        return ApiOk(data);
    }

    // ---- identity + moderator management ----

    // GET /api/v1/admin/me — who the signed-in admin is + which sections they may access.
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var data = await _admin.GetMeAsync(RequirePersonId);
        return ApiOk(data);
    }

    // GET /api/v1/admin/moderators — full admins only.
    [HttpGet("moderators")]
    public async Task<IActionResult> ListModerators()
    {
        var data = await _admin.ListModeratorsAsync(RequirePersonId);
        return ApiOk(new { moderators = data });
    }

    // PUT /api/v1/admin/moderators/{id}/permissions — full admins set a moderator's sections.
    [HttpPut("moderators/{id}/permissions")]
    public async Task<IActionResult> SetModeratorPermissions(string id, [FromBody] SetModeratorPermissionsRequest body)
    {
        var data = await _admin.SetModeratorPermissionsAsync(RequirePersonId, id, body);
        return ApiOk(data);
    }

    // GET /api/v1/admin/conversations — monitor seller↔buyer custom-order chats (read-only).
    [HttpGet("conversations")]
    public async Task<IActionResult> ListConversations()
    {
        var data = await _admin.ListConversationsAsync();
        return ApiOk(new { conversations = data });
    }

    [HttpGet("conversations/{id}")]
    public async Task<IActionResult> GetConversation(string id)
    {
        var data = await _admin.GetConversationAsync(id);
        return ApiOk(data);
    }

    private static Dictionary<string, object?> Total(int total) => new() { ["total"] = total };
}
