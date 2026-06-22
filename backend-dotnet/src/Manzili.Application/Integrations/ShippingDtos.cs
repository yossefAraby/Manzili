namespace Manzili.Application.Integrations;

/// <summary>Body for POST /api/v1/shipping/estimate. Mirrors Node shipping.controller.estimate.</summary>
public sealed class ShippingEstimateRequest
{
    public List<ShippingEstimateItem> Items { get; set; } = new();
}

public sealed class ShippingEstimateItem
{
    public string? ProductId { get; set; }
    public int Quantity { get; set; }
}

/// <summary>Shipping estimate result: { estimatedShipping, currency }.</summary>
public sealed class ShippingEstimateResult
{
    public decimal EstimatedShipping { get; set; }
    public string Currency { get; set; } = "EGP";
}
