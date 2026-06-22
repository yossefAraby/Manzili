using System.Text.Json.Serialization;

namespace Manzili.Application.Orders;

// ---- Requests ----

/// <summary>Body for POST /api/v1/orders. Mirrors Node order.service.createOrder input.</summary>
public sealed class CreateOrderRequest
{
    public List<CreateOrderItem> Items { get; set; } = new();

    public string? AddressId { get; set; }

    public string? PaymentMethod { get; set; }

    /// <summary>
    /// Optional coupon object. Stored verbatim as the order's coupon_snapshot (jsonb).
    /// Only <c>discountAmount</c> is read by the pricing logic; the rest is opaque.
    /// </summary>
    public CreateOrderCoupon? Coupon { get; set; }
}

public sealed class CreateOrderItem
{
    public string? ProductId { get; set; }

    public int Quantity { get; set; }

    /// <summary>Fallback unit price used only when the product has no stored price (Node: product.price || item.price).</summary>
    public decimal? Price { get; set; }
}

/// <summary>Body for POST /api/v1/orders/{id}/return (buyer-initiated return).</summary>
public sealed class ReturnOrderRequest
{
    public string? Reason { get; set; }
}

/// <summary>
/// Coupon payload. Captures the only field the order logic reads (discountAmount) while
/// preserving any extra fields the client sends so the jsonb snapshot is faithful.
/// </summary>
public sealed class CreateOrderCoupon
{
    public decimal? DiscountAmount { get; set; }

    [JsonExtensionData]
    public Dictionary<string, System.Text.Json.JsonElement>? Extra { get; set; }
}

// ---- Response payloads (the "data" portion of the envelope) ----

public sealed class OrderItemDto
{
    public string ProductId { get; set; } = "";
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public sealed class OrderAddressDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string City { get; set; } = "";
    public string Zone { get; set; } = "";
    public string District { get; set; } = "";
    public string Street { get; set; } = "";
    public string Building { get; set; } = "";
    public string Floor { get; set; } = "";
    public string Apartment { get; set; } = "";
    public string PostalCode { get; set; } = "";
}

/// <summary>A Bosta shipment + its event timeline, surfaced to the buyer/seller order views.</summary>
public sealed class ShipmentDto
{
    public string? TrackingNumber { get; set; }
    public string Carrier { get; set; } = "BOSTA";
    /// <summary>Canonical shipment status (CREATED/PICKED_UP/IN_TRANSIT/DELIVERED/FAILED/CANCELED/UNKNOWN).</summary>
    public string Status { get; set; } = "CREATED";
    public string? StatusText { get; set; }
    public string? AwbUrl { get; set; }
    public double? ShippingCost { get; set; }
    public double? CodAmount { get; set; }
    public string? ShippedAt { get; set; }
    public string? DeliveredAt { get; set; }
    public List<ShipmentEventDto> Events { get; set; } = new();
}

public sealed class ShipmentEventDto
{
    public string Type { get; set; } = "";
    public string? Description { get; set; }
    public string OccurredAt { get; set; } = "";
}

/// <summary>Full order detail (create response + GET /orders/{id}).</summary>
public sealed class OrderDetailDto
{
    public string Id { get; set; } = "";
    public string Status { get; set; } = "UNKNOWN";
    public List<OrderItemDto> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal? Discount { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = "COD";
    public bool IsPaid { get; set; }
    public OrderAddressDto? Address { get; set; }
    /// <summary>Primary shipment (first store order) — kept for the single-shipment UI path.</summary>
    public ShipmentDto? Shipment { get; set; }
    /// <summary>All shipments (one per seller/store order in this checkout).</summary>
    public List<ShipmentDto> Shipments { get; set; } = new();
    public string? CreatedAt { get; set; }
}

/// <summary>Single row in GET /orders list.</summary>
public sealed class OrderSummaryDto
{
    public string Id { get; set; } = "";
    public string Status { get; set; } = "UNKNOWN";
    public int ItemCount { get; set; }
    public decimal Total { get; set; }
    public bool IsPaid { get; set; }
    public string PaymentMethod { get; set; } = "COD";
    public ShipmentDto? Shipment { get; set; }
    public List<ShipmentDto> Shipments { get; set; } = new();
    public string? CreatedAt { get; set; }
}

/// <summary>Service result for list: orders + total (total is merged at the top level by the controller).</summary>
public sealed record ListOrdersResult(List<OrderSummaryDto> Orders, int Total);
