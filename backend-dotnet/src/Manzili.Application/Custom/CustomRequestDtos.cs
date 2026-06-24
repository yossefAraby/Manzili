using System.Text.Json.Serialization;
using Manzili.Application.Orders;

namespace Manzili.Application.Custom;

// ---------- Requests (input bodies) ----------

/// <summary>Body for POST /custom/requests. Mirrors the Node createRequest body.</summary>
public sealed class CreateCustomRequestRequest
{
    public string? ItemName { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Visibility { get; set; }            // "open" | "private" (default open)
    public int? Quantity { get; set; }
    public CustomSizeInput? Size { get; set; }
    public string? Material { get; set; }
    public string? DeliveryDate { get; set; }          // ISO date string
    public IReadOnlyList<string>? Images { get; set; }
    public string? VoiceMemoUrl { get; set; }
    public string? StoreId { get; set; }
    public IReadOnlyList<CustomColorInput>? Colors { get; set; }
}

/// <summary>Body for PUT /custom/requests/{id}. All optional — a null field means "leave unchanged".
/// The edit form re-submits the full request (including its existing images/voice memo), so every
/// field the buyer can edit must be here, mirroring CreateCustomRequestRequest.</summary>
public sealed class UpdateCustomRequestRequest
{
    public string? ItemName { get; set; }
    public string? Description { get; set; }
    public string? Visibility { get; set; }            // "open" | "private"
    public string? Category { get; set; }
    public int? Quantity { get; set; }
    public CustomSizeInput? Size { get; set; }
    public string? Material { get; set; }
    public string? DeliveryDate { get; set; }          // ISO date string
    public IReadOnlyList<string>? Images { get; set; }
    public string? VoiceMemoUrl { get; set; }
    public string? StoreId { get; set; }
    public IReadOnlyList<CustomColorInput>? Colors { get; set; }
}

public sealed class CustomSizeInput
{
    public double? Length { get; set; }
    public double? Width { get; set; }
    public double? Height { get; set; }
}

/// <summary>A requested colour: a hex swatch + an optional human description ("warm terracotta").</summary>
public sealed class CustomColorInput
{
    public string? Hex { get; set; }
    public string? Description { get; set; }
}

/// <summary>Body for POST /custom/offers/{id}/messages.</summary>
public sealed class SendOfferMessageRequest
{
    public string? Text { get; set; }
    public string? Image { get; set; }
}

/// <summary>Body for POST /custom/requests/{id}/offers (seller submits an offer).</summary>
public sealed class SubmitOfferRequest
{
    public decimal Price { get; set; }
    public string? DeliveryDate { get; set; }   // ISO date string (no offer-level column to persist; accepted for forward-compat)
    public string? Comment { get; set; }         // stored as the seller's comment
}

/// <summary>Body for PATCH /custom/offers/{id} (lifecycle transition).</summary>
public sealed class OfferActionRequest
{
    public string? Action { get; set; }          // accept | decline | block (buyer) ; progress | ready (seller)
    public string? Comment { get; set; }
}

/// <summary>Body for POST /custom/offers/{id}/payments.</summary>
public sealed class OfferPaymentRequest
{
    public string? Milestone { get; set; }       // first | second | final
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? AddressId { get; set; }
}

// ---------- Responses ----------

public sealed class CustomSizeDto
{
    [JsonPropertyName("length")] public double? Length { get; set; }
    [JsonPropertyName("width")] public double? Width { get; set; }
    [JsonPropertyName("height")] public double? Height { get; set; }
}

public sealed class CustomColorDto
{
    [JsonPropertyName("hex")] public string Hex { get; set; } = "";
    [JsonPropertyName("description")] public string? Description { get; set; }
}

public sealed class CustomUserDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("image")] public string? Image { get; set; }
}

public sealed class CustomStoreDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("name")] public string Name { get; set; } = "";
}

/// <summary>List item for GET /custom/requests (the slimmer card shape).</summary>
public sealed class CustomRequestListItemDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("image")] public string Image { get; set; } = "";
    [JsonPropertyName("itemName")] public string ItemName { get; set; } = "";
    [JsonPropertyName("category")] public string Category { get; set; } = "";
    [JsonPropertyName("visibility")] public string Visibility { get; set; } = "open";
    [JsonPropertyName("createdAt")] public string CreatedAt { get; set; } = "";
    [JsonPropertyName("user")] public CustomUserDto User { get; set; } = new();
}

/// <summary>Full request detail for GET/POST/PUT /custom/requests[/{id}].</summary>
public sealed class CustomRequestDetailDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("itemName")] public string ItemName { get; set; } = "";
    [JsonPropertyName("description")] public string Description { get; set; } = "";
    [JsonPropertyName("category")] public string Category { get; set; } = "";
    [JsonPropertyName("images")] public IReadOnlyList<string> Images { get; set; } = [];
    [JsonPropertyName("colors")] public IReadOnlyList<CustomColorDto> Colors { get; set; } = [];
    [JsonPropertyName("voiceMemo")] public string? VoiceMemo { get; set; }
    [JsonPropertyName("quantity")] public int Quantity { get; set; }
    [JsonPropertyName("material")] public string? Material { get; set; }
    [JsonPropertyName("size")] public CustomSizeDto? Size { get; set; }
    [JsonPropertyName("deliveryDate")] public string? DeliveryDate { get; set; }
    [JsonPropertyName("visibility")] public string Visibility { get; set; } = "open";
    [JsonPropertyName("store")] public CustomStoreDto? Store { get; set; }
    [JsonPropertyName("user")] public CustomUserDto User { get; set; } = new();
    [JsonPropertyName("createdAt")] public string CreatedAt { get; set; } = "";
    [JsonPropertyName("updatedAt")] public string UpdatedAt { get; set; } = "";
}

// ---------- Offers ----------

public sealed class OfferCommentDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("author")] public string Author { get; set; } = "";   // "buyer" | "seller"
    [JsonPropertyName("text")] public string Text { get; set; } = "";
    [JsonPropertyName("createdAt")] public string CreatedAt { get; set; } = "";
}

public sealed class OfferPaymentDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("milestone")] public string Milestone { get; set; } = "";  // "first" | "second" | "final"
    [JsonPropertyName("amount")] public decimal Amount { get; set; }
    [JsonPropertyName("paymentMethod")] public string PaymentMethod { get; set; } = "";
    [JsonPropertyName("paidAt")] public string PaidAt { get; set; } = "";
}

public sealed class OfferShippingAddressDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("street")] public string? Street { get; set; }
    [JsonPropertyName("buildingNumber")] public string? BuildingNumber { get; set; }
    [JsonPropertyName("apartmentNumber")] public string? ApartmentNumber { get; set; }
    [JsonPropertyName("zipCode")] public string? ZipCode { get; set; }
}

public sealed class OfferDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("requestId")] public string RequestId { get; set; } = "";
    [JsonPropertyName("sellerId")] public string SellerId { get; set; } = "";
    [JsonPropertyName("sellerName")] public string SellerName { get; set; } = "";
    [JsonPropertyName("sellerLogo")] public string? SellerLogo { get; set; }   // store logo URL → buyer-side avatar
    [JsonPropertyName("price")] public decimal Price { get; set; }
    [JsonPropertyName("deliveryDate")] public string? DeliveryDate { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("comments")] public IReadOnlyList<OfferCommentDto> Comments { get; set; } = [];
    [JsonPropertyName("payments")] public IReadOnlyList<OfferPaymentDto> Payments { get; set; } = [];
    [JsonPropertyName("shippingAddress")] public OfferShippingAddressDto? ShippingAddress { get; set; }
    [JsonPropertyName("createdAt")] public string CreatedAt { get; set; } = "";
    [JsonPropertyName("updatedAt")] public string? UpdatedAt { get; set; }
    [JsonPropertyName("acceptedAt")] public string? AcceptedAt { get; set; }
    [JsonPropertyName("firstPaidAt")] public string? FirstPaidAt { get; set; }
    [JsonPropertyName("readyToShipAt")] public string? ReadyToShipAt { get; set; }
    [JsonPropertyName("paidAt")] public string? PaidAt { get; set; }

    // ---- Custom-order tracking (populated once the final milestone turns the offer
    // into a real Bosta-tracked order via FulfillmentService.CreateCustomOrderForOfferAsync) ----

    /// <summary>The real order id created for this offer (Order.TransactionRef == "offer_{id}"), or null.</summary>
    [JsonPropertyName("orderId")] public string? OrderId { get; set; }
    /// <summary>The custom order's single store-order id — what the dev-only simulate-delivery demo advances. Null until the order exists.</summary>
    [JsonPropertyName("storeOrderId")] public string? StoreOrderId { get; set; }
    /// <summary>The placeholder product id the custom order was placed against — lets the buyer review the piece. Null until the order exists.</summary>
    [JsonPropertyName("productId")] public string? ProductId { get; set; }
    /// <summary>The custom order's Bosta shipment + event timeline, or null if no order/shipment yet.</summary>
    [JsonPropertyName("shipment")] public ShipmentDto? Shipment { get; set; }
    /// <summary>True once the custom order's shipment is DELIVERED (drives the review surface).</summary>
    [JsonPropertyName("delivered")] public bool Delivered { get; set; }
}

// ---------- Offer messages ----------

public sealed class OfferMessageDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("author")] public string Author { get; set; } = "";   // "buyer" | "seller"
    [JsonPropertyName("text")] public string Text { get; set; } = "";
    [JsonPropertyName("image")] public string? Image { get; set; }           // progress-update image (Cloudinary URL)
    [JsonPropertyName("createdAt")] public string CreatedAt { get; set; } = "";
}
