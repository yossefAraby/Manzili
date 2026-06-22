namespace Manzili.Application.Reports;

/// <summary>Body for POST /api/v1/reports — a buyer/user flags a product, seller, order or request.</summary>
public sealed class CreateReportRequest
{
    /// <summary>NON_HANDMADE_PRODUCT | SELLER_MISCONDUCT | UNFULFILLED_CUSTOM_REQUEST | GENERAL.</summary>
    public string? Type { get; set; }
    public string? Reason { get; set; }
    public string? Description { get; set; }
    public string? ProductId { get; set; }
    public string? StoreId { get; set; }
    public string? StoreOrderId { get; set; }
    public string? CustomRequestId { get; set; }
}

public sealed class CreateReportResult
{
    public string Id { get; set; } = "";
    public string Status { get; set; } = "PENDING";
}
