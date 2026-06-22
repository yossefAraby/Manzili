using System.Text.Json.Serialization;

namespace Manzili.Application.Account;

/// <summary>Image shape used by product/wishlist cards: { src, width, height }.</summary>
public sealed class CardImageDto
{
    public string Src { get; set; } = "";
    public int Width { get; set; }
    public int Height { get; set; }
}

/// <summary>Store summary embedded in a card.</summary>
public sealed class CardStoreDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
}

/// <summary>
/// Wishlist card. Field names match the OpenAPI product-card shape
/// ("main image", "offer price"); logic mirrors Node services/wishlist.service.js.
/// </summary>
public sealed class WishlistCardDto
{
    public string Id { get; set; } = "";

    public string Name { get; set; } = "";

    [JsonPropertyName("main image")]
    public CardImageDto? MainImage { get; set; }

    public decimal Price { get; set; }

    [JsonPropertyName("offer price")]
    public decimal? OfferPrice { get; set; }

    public double Rating { get; set; }

    public int ReviewCount { get; set; }

    public bool IsWishlisted { get; set; }

    public List<string> Category { get; set; } = new();

    public bool InStock { get; set; }

    public CardStoreDto? Store { get; set; }
}

/// <summary>Data payload for GET /api/v1/wishlist; "total" is merged at top level by the controller.</summary>
public sealed class WishlistResult
{
    public List<WishlistCardDto> WishlistCards { get; set; } = new();
    public int Total { get; set; }
}
