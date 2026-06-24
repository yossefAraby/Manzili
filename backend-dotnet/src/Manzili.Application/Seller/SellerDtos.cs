namespace Manzili.Application.Seller;

// ============ Dashboard ============
public sealed class DashboardDto
{
    public int TotalProducts { get; set; }
    public double TotalEarnings { get; set; }
    public int TotalOrders { get; set; }
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }
}

// ============ Products ============
public sealed class SellerProductListItemDto
{
    public string Id { get; set; } = "";
    public string? Name { get; set; }
    public string? MainImage { get; set; }
    public double Price { get; set; }
    public double? OfferPrice { get; set; }
    public bool InStock { get; set; }
    public int Stock { get; set; }
    public int TotalSold { get; set; }
    public string Category { get; set; } = "";
    /// <summary>Whether the seller has disabled (hidden) this product. The manage-product
    /// table shows a "Disabled" badge and offers a re-enable toggle when true.</summary>
    public bool IsDisabled { get; set; }
    /// <summary>Shipping profile — lets the manage-product page show a REAL size-based delivery estimate.</summary>
    public string ShippingSize { get; set; } = "MEDIUM";
    public string ShippingBulkyCategory { get; set; } = "NORMAL";
    /// <summary>True while this product has an active paid promotion (featured on the homepage).</summary>
    public bool IsPromoted { get; set; }
    /// <summary>When the active promotion ends (ISO), or null if not promoted.</summary>
    public string? PromotedUntil { get; set; }
}

/// <summary>Body for POST /seller/promotions — feature a product for a window.</summary>
public sealed class CreatePromotionRequest
{
    public string? ProductId { get; set; }
    /// <summary>"day" (50 EGP) or "week" (300 EGP).</summary>
    public string? Plan { get; set; }
}

// Seller-scoped product detail used to prefill the edit form. Unlike the public
// ProductDetailDto it ignores IsDisabled (so a disabled product is still editable)
// and surfaces the raw seller-editable fields (list/sale price, all images,
// shipping profile, grouped variants with per-option price-delta/swatch/image).
public sealed class SellerProductDetailDto
{
    public string Id { get; set; } = "";
    public string? Name { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public double Mrp { get; set; }
    public double? OfferPrice { get; set; }
    public int Stock { get; set; }
    public bool InStock { get; set; }
    public bool IsDisabled { get; set; }
    public IReadOnlyList<string> Images { get; set; } = [];
    public string ShippingSize { get; set; } = "MEDIUM";
    public string ShippingBulkyCategory { get; set; } = "NORMAL";
    public IReadOnlyList<ProductVariantDto>? Variants { get; set; }
}

public sealed class SellerProductsResult
{
    public IReadOnlyList<SellerProductListItemDto> Products { get; set; } = [];
    public int Total { get; set; }
}

// Product detail (mapProductDetail in Node)
public sealed class ProductDetailDto
{
    public string Id { get; set; } = "";
    public string? Name { get; set; }
    public IReadOnlyList<ProductImageDto> Images { get; set; } = [];
    public double Price { get; set; }
    public double? OfferPrice { get; set; }
    public bool IsWishlisted { get; set; }
    public IReadOnlyList<string> Category { get; set; } = [];
    public string Description { get; set; } = "";
    public IReadOnlyList<object> Size { get; set; } = [];
    public int Stock { get; set; }
    public bool InStock { get; set; }
    public ProductStoreDto? Store { get; set; }
    public IReadOnlyList<ProductVariantDto>? Variants { get; set; }
}

public sealed class ProductImageDto
{
    public string Src { get; set; } = "";
    public int Width { get; set; }
    public int Height { get; set; }
}

public sealed class ProductStoreDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
}

public sealed class ProductVariantDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public IReadOnlyList<ProductVariantOptionDto> Options { get; set; } = [];
}

public sealed class ProductVariantOptionDto
{
    public string Id { get; set; } = "";
    public string Value { get; set; } = "";
    public int Stock { get; set; }
    /// <summary>Amount added to the product's base price/mrp when this option is chosen.</summary>
    public decimal PriceDelta { get; set; }
    /// <summary>Hex swatch (#RRGGBB) for color options; null otherwise.</summary>
    public string? Swatch { get; set; }
    /// <summary>Optional image shown when this option is selected.</summary>
    public string? ImageUrl { get; set; }
}

// Request bodies
public sealed class CreateProductRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public decimal? Mrp { get; set; }
    public int? Stock { get; set; }
    public string? Category { get; set; }
    public List<string>? Images { get; set; }
    public List<ProductVariantInput>? Variants { get; set; }
    public string? ShippingSize { get; set; }
    public string? ShippingBulkyCategory { get; set; }
}

public sealed class UpdateProductRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public decimal? Mrp { get; set; }
    public int? Stock { get; set; }
    public bool? InStock { get; set; }
    public string? Category { get; set; }
    public List<string>? Images { get; set; }
    public string? ShippingSize { get; set; }
    public string? ShippingBulkyCategory { get; set; }
    // Grouped variants — when non-null the whole variant set is replaced (delete-and-reinsert).
    public List<ProductVariantInput>? Variants { get; set; }
}

public sealed class SetProductStatusRequest
{
    /// <summary>True to hide the product from the storefront; false to re-enable it.</summary>
    public bool Disabled { get; set; }
}

public sealed class ProductVariantInput
{
    public string? Name { get; set; }
    public List<VariantOptionInput>? Options { get; set; }
}

public sealed class VariantOptionInput
{
    public string? Value { get; set; }
    public int? Stock { get; set; }
    /// <summary>Per-option price adjustment added to the base price/mrp. Defaults to 0.</summary>
    public decimal? PriceDelta { get; set; }
    /// <summary>Hex swatch (#RRGGBB) for color options.</summary>
    public string? Swatch { get; set; }
    /// <summary>Hosted image URL (already uploaded by the client) shown for this option.</summary>
    public string? ImageUrl { get; set; }
}

// ============ Orders ============
public sealed class SellerOrderDto
{
    public string Id { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public IReadOnlyList<OrderItemDto> Items { get; set; } = [];
    public double Total { get; set; }
    public string Status { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    public bool IsPaid { get; set; }
    public string CreatedAt { get; set; } = "";
    public OrderAddressDto? Address { get; set; }
    /// <summary>Bosta shipment + timeline for this store order (null until fulfillment creates it).</summary>
    public Manzili.Application.Orders.ShipmentDto? Shipment { get; set; }
}

public sealed class OrderItemDto
{
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
}

public sealed class OrderAddressDto
{
    public string City { get; set; } = "";
    public string District { get; set; } = "";
}

public sealed class SellerOrdersResult
{
    public IReadOnlyList<SellerOrderDto> Orders { get; set; } = [];
    public int Total { get; set; }
}

public sealed class UpdateOrderStatusRequest
{
    public string Status { get; set; } = "";
}

public sealed class OrderStatusResult
{
    public string Id { get; set; } = "";
    public string Status { get; set; } = "";
}

// ============ Settings ============
public sealed class SettingsDto
{
    public string Name { get; set; } = "";
    public string? Logo { get; set; }
    public string Description { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Address { get; set; } = "";
    public PickupAddressDto? PickupAddress { get; set; }
}

public sealed class PickupAddressDto
{
    public string FirstLine { get; set; } = "";
    public string City { get; set; } = "";
    public string Phone { get; set; } = "";
    public string ContactName { get; set; } = "";
}

public sealed class UpdateSettingsRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Logo { get; set; }
    public string? Address { get; set; }
}

// ============ Warehouses (seller pickup locations) ============
// A seller may keep several warehouses; Bosta collects orders from the default one.
public sealed class WarehouseDto
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public string FirstLine { get; set; } = "";
    public string City { get; set; } = "";
    public string Phone { get; set; } = "";
    public string ContactName { get; set; } = "";
    public string? BostaCityId { get; set; }
    public string? BostaZoneId { get; set; }
    public string? BostaDistrictId { get; set; }
    public bool IsDefault { get; set; }
    public string CreatedAt { get; set; } = "";
}

public sealed class SaveWarehouseRequest
{
    public string? Label { get; set; }
    public string? FirstLine { get; set; }
    public string? City { get; set; }
    public string? Phone { get; set; }
    public string? ContactName { get; set; }
    public string? BostaCityId { get; set; }
    public string? BostaZoneId { get; set; }
    public string? BostaDistrictId { get; set; }
    public bool? IsDefault { get; set; }
}
