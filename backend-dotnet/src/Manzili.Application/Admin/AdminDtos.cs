namespace Manzili.Application.Admin;

// ---- GET /admin/stats ----
public sealed class AdminStatsDto
{
    public int Stores { get; set; }
    public int Products { get; set; }
    public int Orders { get; set; }
    public int PendingReports { get; set; }
    public double Revenue { get; set; }
}

// ---- GET /admin/revenue (full administrators only) ----
/// <summary>Manzili's own commission take: 15% of standard sales + 10% of custom-order sales.</summary>
public sealed class AdminRevenueDto
{
    public double PlatformRevenue { get; set; }      // total Manzili income (commissions + promotions)
    public double StandardCommission { get; set; }   // 15% take from standard sales
    public double CustomCommission { get; set; }     // 10% take from custom-order sales
    public double PromotionRevenue { get; set; }     // paid "feature my product" promotions (100% Manzili)
    public double StandardSales { get; set; }        // gross goods value of standard sales
    public double CustomSales { get; set; }          // gross goods value of custom-order sales
    public double GrossSales { get; set; }           // standard + custom goods value
    public double StandardRatePercent { get; set; }  // e.g. 15
    public double CustomRatePercent { get; set; }    // e.g. 10
}

// ---- GET /admin/orders ----
public sealed class AdminOrderDto
{
    public string Id { get; set; } = "";
    public string StoreName { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public IReadOnlyList<AdminOrderItemDto> Items { get; set; } = [];
    public double Total { get; set; }
    public string Status { get; set; } = "";
    public string CreatedAt { get; set; } = "";
}

public sealed class AdminOrderItemDto
{
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
}

// ---- GET /admin/products ----
public sealed class AdminProductDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public double Price { get; set; }
    public string Category { get; set; } = "";
    public string StoreName { get; set; } = "";
    public bool InStock { get; set; }
    public bool IsDisabled { get; set; }
}

// ---- GET /admin/stores ----
public sealed class AdminStoreDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Username { get; set; }
    public string? Logo { get; set; }
    public string? Email { get; set; }
    public string? Contact { get; set; }
    public string? Address { get; set; }
    /// <summary>Owner's national-ID photo URL — shown on the admin review board so verification is possible.</summary>
    public string? NationalIdImage { get; set; }
    public string OwnerName { get; set; } = "";
    public string? OwnerEmail { get; set; }
    public string Status { get; set; } = "";
    public bool IsActive { get; set; }
    public string? CreatedAt { get; set; }
}

// ---- POST /admin/stores ----
public sealed class AdminStoreActionRequest
{
    public string? StoreId { get; set; }
    public string? Action { get; set; }
}

// ---- POST /admin/orders/{id}/status ----
public sealed class AdminOrderStatusRequest
{
    public string? Status { get; set; }
}

public sealed class AdminStoreActionResult
{
    public string Id { get; set; } = "";
    public string? Status { get; set; }
    public bool? IsActive { get; set; }
}

// ---- POST /admin/products ----
public sealed class AdminProductActionRequest
{
    public string? ProductId { get; set; }
    public string? Action { get; set; }   // disable | enable | delete
}

public sealed class AdminProductActionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
}

// ---- GET /admin/reports ----
public sealed class AdminReportDto
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public string Reason { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "";
    public string AdminNote { get; set; } = "";
    public string? ReporterName { get; set; }
    public string? ProductId { get; set; }
    public string? StoreId { get; set; }
    public string? StoreOrderId { get; set; }
    public string? CustomRequestId { get; set; }
    public string CreatedAt { get; set; } = "";
}

// ---- POST /admin/reports/{id}/action ----
public sealed class AdminReportActionRequest
{
    public string? Action { get; set; }
    public string? AdminNote { get; set; }
}

public sealed class AdminReportActionResult
{
    public string Id { get; set; } = "";
    public string? Status { get; set; }
}

// ---- GET /admin/returns (returns awaiting admin approval) ----
public sealed class AdminReturnDto
{
    public string Id { get; set; } = "";
    public string StoreOrderId { get; set; } = "";
    public string StoreName { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "PENDING_APPROVAL";
    public double? RefundAmount { get; set; }
    public IReadOnlyList<AdminOrderItemDto> Items { get; set; } = [];
    public string CreatedAt { get; set; } = "";
}

// ---- POST /admin/returns/{id}/reject ----
public sealed class AdminRejectReturnRequest
{
    public string? Note { get; set; }
}

public sealed class AdminReturnActionResult
{
    public string Id { get; set; } = "";
    public string Status { get; set; } = "";
    public double? RefundAmount { get; set; }
    public string? TrackingNumber { get; set; }
}

// ---- GET /admin/requests ----
public sealed class AdminRequestDto
{
    public string Id { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public short? Status { get; set; }
    public string? CreatedAt { get; set; }
}

// ---- GET/POST/DELETE /admin/coupons ----
public sealed class AdminCouponDto
{
    public string Id { get; set; } = "";
    public string Code { get; set; } = "";
    public string Description { get; set; } = "";
    public double DiscountPercentage { get; set; }
    public string Scope { get; set; } = "GLOBAL";
    public bool Active { get; set; }
    public string? ExpiredDate { get; set; }
    public int MaxUsers { get; set; }
    public int UsedCount { get; set; }
    public string? StoreId { get; set; }
    public string? CreatedAt { get; set; }
}

public sealed class AdminCreateCouponRequest
{
    public string? Code { get; set; }
    public string? Description { get; set; }
    public double DiscountPercentage { get; set; }
    public string? Scope { get; set; }       // GLOBAL | STORE | PRODUCTS
    public string? ExpiredDate { get; set; }
    public int? MaxUsers { get; set; }
    public string? StoreId { get; set; }
}

public sealed class AdminActionResult
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = "";
}

// ---- GET /admin/me (who is the signed-in admin + what can they access) ----
public sealed class AdminMeDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public bool IsSuperAdmin { get; set; }
    /// <summary>Section keys the admin may access: orders|products|stores|reports|requests|coupons.</summary>
    public IReadOnlyList<string> Permissions { get; set; } = [];
}

// ---- GET/PUT /admin/moderators (super-admin manages moderators' section access) ----
public sealed class AdminModeratorDto
{
    public string Id { get; set; } = "";   // the moderator's personId
    public string Name { get; set; } = "";
    public string? Email { get; set; }
    public IReadOnlyList<string> Permissions { get; set; } = [];
}

public sealed class SetModeratorPermissionsRequest
{
    public List<string> Permissions { get; set; } = new();
}

// ---- GET /admin/conversations (monitor seller↔buyer custom-order chats) ----
public sealed class AdminConversationDto
{
    public string Id { get; set; } = "";   // offer id
    public string ItemName { get; set; } = "";
    public string BuyerName { get; set; } = "";
    public string SellerName { get; set; } = "";
    public string Status { get; set; } = "";
    public int MessageCount { get; set; }
    public string? LastMessageAt { get; set; }
}

public sealed class AdminMessageDto
{
    public string Id { get; set; } = "";
    public string Author { get; set; } = "";   // "buyer" | "seller"
    public string Text { get; set; } = "";
    public string? ImageUrl { get; set; }
    public string CreatedAt { get; set; } = "";
}

public sealed class AdminConversationDetailDto
{
    public string Id { get; set; } = "";
    public string RequestId { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string BuyerName { get; set; } = "";
    public string SellerName { get; set; } = "";
    public string Status { get; set; } = "";
    public IReadOnlyList<AdminMessageDto> Messages { get; set; } = [];
}

// ---- paged wrapper for list endpoints with a total ----
public sealed class AdminPaged<T>
{
    public IReadOnlyList<T> Items { get; set; } = [];
    public int Total { get; set; }
}
