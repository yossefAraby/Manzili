using System.Text.Json.Serialization;

namespace Manzili.Application.Catalog;

/// <summary>
/// Storefront product-list filter (the shop grid). <paramref name="Category"/> may be a single
/// category name or a comma-separated list (OR-matched). All fields are optional; a null/blank
/// field means "no constraint". Applied in SQL so each page fetches only its slice.
/// </summary>
public readonly record struct ProductListFilter(
    string? Category,
    string? Search,
    decimal? MinPrice,
    decimal? MaxPrice,
    bool? InStock,
    string? SortBy,
    string? SortDir);

// ---- Shared building blocks ----

/// <summary>Image object as emitted by Node ({ src, width, height }).</summary>
public sealed class ImageDto
{
    public string Src { get; set; } = "";
    public int Width { get; set; }
    public int Height { get; set; }
}

/// <summary>Store summary embedded in product cards / details.</summary>
public sealed class StoreRefDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    /// <summary>Store handle — powers the "View store" → /shop/{username} link on product pages.</summary>
    public string? Username { get; set; }
    /// <summary>Store logo URL (Seller.LogoUrl); null when the seller hasn't uploaded one — the UI shows a letter avatar then.</summary>
    public string? Logo { get; set; }
    /// <summary>Seller's city (from their default pickup warehouse, falling back to free-text address).
    /// Lets the recommender favour items physically NEAR the buyer. Null when the seller has no address.</summary>
    public string? City { get; set; }
    /// <summary>Bosta city id of the seller's default warehouse — a normalized geo key for proximity matching.</summary>
    public string? BostaCityId { get; set; }
}

// ---- Product card (list / featured / latest / store products) ----
// Field names with spaces ("main image", "offer price") per OpenAPI.
public sealed class ProductCardDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";

    [JsonPropertyName("main image")]
    public ImageDto? MainImage { get; set; }

    public double Price { get; set; }

    [JsonPropertyName("offer price")]
    public double? OfferPrice { get; set; }

    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public bool IsWishlisted { get; set; }
    public IReadOnlyList<string> Category { get; set; } = new List<string>();
    /// <summary>Short product description (truncated) — gives the AI recommender/search semantic context.</summary>
    public string? Description { get; set; }
    public bool InStock { get; set; }
    public int Stock { get; set; }
    public StoreRefDto? Store { get; set; }
}

// ---- Search product card (uses images[] string array, category as string) ----
public sealed class SearchProductDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public IReadOnlyList<string> Images { get; set; } = new List<string>();
    public double Price { get; set; }
    public double? OfferPrice { get; set; }
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public bool IsWishlisted { get; set; }
    public string Category { get; set; } = "";
    /// <summary>Short product description (truncated) — semantic context for AI search.</summary>
    public string? Description { get; set; }
    public bool InStock { get; set; }
    public int Stock { get; set; }
    public StoreRefDto? Store { get; set; }
}

// ---- Review item ----
public sealed class ReviewDto
{
    public string Id { get; set; } = "";
    public double Rating { get; set; }
    public string Text { get; set; } = "";
    public string UserName { get; set; } = "";
    public string Date { get; set; } = "";
}

// ---- Product detail ----
public sealed class ProductReviewsDto
{
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public IReadOnlyList<ReviewDto> Items { get; set; } = new List<ReviewDto>();
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

public sealed class ProductVariantDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public IReadOnlyList<ProductVariantOptionDto> Options { get; set; } = new List<ProductVariantOptionDto>();
}

public sealed class ProductDetailDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public IReadOnlyList<ImageDto> Images { get; set; } = new List<ImageDto>();
    public double Price { get; set; }
    public double? OfferPrice { get; set; }
    public bool IsWishlisted { get; set; }
    public IReadOnlyList<string> Category { get; set; } = new List<string>();
    public string Description { get; set; } = "";
    public IReadOnlyList<string> Size { get; set; } = new List<string>();
    /// <summary>Units available for a simple (non-variant) product; variant stock lives per option.</summary>
    public int Stock { get; set; }
    public bool InStock { get; set; }
    /// <summary>Package size (SMALL/MEDIUM/LARGE) — lets the product page show an "estimated shipping" widget.</summary>
    public string? ShippingSize { get; set; }
    /// <summary>Bulky class (NORMAL/LIGHT/HEAVY) — together with size it drives the delivery estimate.</summary>
    public string? ShippingBulkyCategory { get; set; }
    public StoreRefDto? Store { get; set; }
    public IReadOnlyList<ProductVariantDto>? Variants { get; set; }
    public ProductReviewsDto Reviews { get; set; } = new();
}

// ---- Store detail ----
public sealed class StoreDetailDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Logo { get; set; }
    public string Description { get; set; } = "";
    public string Location { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public double Rating { get; set; }
    public int TotalProducts { get; set; }
    public int TotalReviews { get; set; }
}

// ---- Completed custom-work piece (public store profile "Custom Work" section) ----
// One delivered + reviewed bespoke order for a seller. The image is guarded against
// oversized base64 data: URLs (custom-request images) — a placeholder is used instead.
public sealed class CustomWorkDto
{
    public string Id { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string? Image { get; set; }
    public double Rating { get; set; }
    public string ReviewText { get; set; } = "";
    public string? CompletedAt { get; set; }
}

// ---- Store apply request (Node body: name, description, email, phone, logo, address) ----
public sealed class StoreApplyRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Logo { get; set; }
    public string? Address { get; set; }
    /// <summary>Store handle/slug; powers /shop/{username} profile links. Deduped server-side.</summary>
    public string? Username { get; set; }
    /// <summary>Hosted URL of the owner's national-ID photo — required for admin verification.</summary>
    public string? NationalIdImage { get; set; }
    /// <summary>Optional structured pickup address; becomes the seller's first (default) warehouse.</summary>
    public StoreApplyPickup? Pickup { get; set; }
}

public sealed class StoreApplyPickup
{
    public string? FirstLine { get; set; }
    public string? City { get; set; }
    public string? BostaCityId { get; set; }
    public string? BostaZoneId { get; set; }
    public string? BostaDistrictId { get; set; }
    public string? Phone { get; set; }
    public string? ContactName { get; set; }
}

// ---- The current user's own store-application / verification status ----
public sealed class MyApplicationDto
{
    public bool HasApplication { get; set; }
    public string? Status { get; set; }   // pending | approved | rejected | deleted
    public bool IsActive { get; set; }
    public string? StoreId { get; set; }
    public string? Name { get; set; }
}

// ---- Rating create request (Node body: productId, rating, review; optional orderId) ----
public sealed class CreateRatingRequest
{
    public string ProductId { get; set; } = "";
    public double Rating { get; set; }
    public string? Review { get; set; }
    public string? OrderId { get; set; }
}

// ---- Paged result holder ----
public sealed class PagedProducts<T>
{
    public IReadOnlyList<T> Items { get; init; } = new List<T>();
    public int Total { get; init; }
    public int Page { get; init; }
    public int Limit { get; init; }
}
