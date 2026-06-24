namespace Manzili.Application.Integrations;

/// <summary>
/// Body for POST /api/v1/shipping/estimate. Two modes:
///  • items + optional dropOff city  → price each item's seller→buyer leg by size+distance.
///  • size (+ bulky) with no items   → a size-only range across distance tiers (custom-order estimate).
/// </summary>
public sealed class ShippingEstimateRequest
{
    public List<ShippingEstimateItem> Items { get; set; } = new();

    /// <summary>Buyer drop-off city (for the distance tier). Null → an unknown/mid estimate.</summary>
    public string? DropOffCity { get; set; }
    public string? DropOffBostaCityId { get; set; }

    /// <summary>Size-only mode: a package size (SMALL/MEDIUM/LARGE) with no items.</summary>
    public string? Size { get; set; }
    public string? Bulky { get; set; }
}

public sealed class ShippingEstimateItem
{
    public string? ProductId { get; set; }
    public int Quantity { get; set; }
}

/// <summary>Shipping estimate result: a point fee plus the size+distance range it sits in.</summary>
public sealed class ShippingEstimateResult
{
    public decimal EstimatedShipping { get; set; }
    public decimal Low { get; set; }
    public decimal High { get; set; }
    public string Currency { get; set; } = "EGP";
    /// <summary>"sameCity" | "sameRegion" | "crossCountry" | "mixed" | "range" | "unknown".</summary>
    public string Tier { get; set; } = "unknown";
    public bool SameCity { get; set; }
}
