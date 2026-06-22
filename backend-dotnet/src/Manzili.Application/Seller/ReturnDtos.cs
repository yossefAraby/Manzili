namespace Manzili.Application.Seller;

public sealed class ReturnDto
{
    public string Id { get; set; } = "";
    public string Reason { get; set; } = "";
    public short? Status { get; set; }
    public double? RefundAmount { get; set; }
    public string CreatedAt { get; set; } = "";
    public IReadOnlyList<OrderItemDto> Items { get; set; } = [];
    /// <summary>Reverse-logistics (Bosta) shipment + timeline for this return, when created.</summary>
    public Manzili.Application.Orders.ShipmentDto? Shipment { get; set; }
}

public sealed class ProcessReturnRequest
{
    public string? Reason { get; set; }
}

public sealed class ProcessReturnResult
{
    public string Id { get; set; } = "";
    public string StoreOrderId { get; set; } = "";
    public double RefundAmount { get; set; }
}
