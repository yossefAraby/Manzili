using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/product.service.js.</summary>
public sealed class ProductService
{
    private readonly ManziliDbContext _db;
    private readonly PromotionService _promotions;

    public ProductService(ManziliDbContext db, PromotionService promotions)
    {
        _db = db;
        _promotions = promotions;
    }

    /// <summary>Set of productids wishlisted by the given person (empty if not logged in).</summary>
    internal async Task<HashSet<int>> GetWishlistedIdsAsync(int? userId)
    {
        if (userId is null) return new HashSet<int>();

        var enduser = await _db.Endusers.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Personid == userId.Value);
        if (enduser?.Wichlistid is null) return new HashSet<int>();

        var wichlistId = enduser.Wichlistid.Value;
        var ids = await _db.Wishlists.AsNoTracking()
            .Where(w => w.Wichlistid == wichlistId)
            .SelectMany(w => w.Products.Select(p => p.Productid))
            .ToListAsync();

        return ids.ToHashSet();
    }

    private static double AvgRating(IEnumerable<double> ratings)
    {
        var list = ratings as ICollection<double> ?? ratings.ToList();
        if (list.Count == 0) return 0;
        return list.Average();
    }

    private static double Round1(double v) => Math.Round(v * 10) / 10;

    /// <summary>
    /// Resolve a seller's location for proximity-based recommendations: prefer the default
    /// pickup warehouse's city + Bosta city id (a normalized geo key), then any warehouse,
    /// then the free-text address. Returns nulls when nothing is on file. The pickup-address
    /// collection must be Included on the query for this to be populated.
    /// </summary>
    private static (string? City, string? BostaCityId) SellerLocation(Seller? s)
    {
        if (s == null) return (null, null);
        var w = s.StorePickupAddresses?.FirstOrDefault(x => x.IsDefault)
                ?? s.StorePickupAddresses?.FirstOrDefault();
        var city = w?.City;
        if (string.IsNullOrWhiteSpace(city)) city = s.AddressText;
        return (string.IsNullOrWhiteSpace(city) ? null : city, w?.BostaCityId);
    }

    internal static ProductCardDto MapCard(Product p, IReadOnlySet<int> wishlistedIds)
    {
        var mainImage = p.CoverUrl
            ?? p.ProductImages.Select(i => i.ImageUrl).FirstOrDefault(u => u != null);

        var ratings = p.ReviewingAndRatings.Select(r => r.Rating);
        var avg = AvgRating(ratings);

        var price = p.Mrp.HasValue ? (double)p.Mrp.Value : (double)(p.Price ?? 0m);
        double? offerPrice = p.Mrp.HasValue && p.Price.HasValue ? (double)p.Price.Value : null;

        return new ProductCardDto
        {
            Id = p.Productid.ToString(),
            Name = p.Productname,
            MainImage = mainImage != null ? new ImageDto { Src = mainImage, Width = 400, Height = 400 } : null,
            Price = price,
            OfferPrice = offerPrice,
            Rating = Round1(avg),
            ReviewCount = p.ReviewingAndRatings.Count,
            IsWishlisted = wishlistedIds.Contains(p.Productid),
            Category = p.Category != null ? new List<string> { p.Category.CategoryName } : new List<string>(),
            Description = Truncate(p.Description, 200),
            InStock = p.InStock ?? true,
            Stock = p.Stock ?? 0,
            Store = BuildStoreRef(p.Seller),
        };
    }

    /// <summary>Map a seller onto the embedded store ref, including its city for proximity ranking.</summary>
    private static StoreRefDto? BuildStoreRef(Seller? s)
    {
        if (s == null) return null;
        var (city, bostaCityId) = SellerLocation(s);
        return new StoreRefDto
        {
            Id = s.Sellerid.ToString(),
            Name = s.Storename ?? "",
            Username = s.Username,
            City = city,
            BostaCityId = bostaCityId,
        };
    }

    // Mirrors Node productInclude (category, seller, first 5 images, ratings) plus the seller's
    // pickup warehouses so the card can carry the seller city for proximity-based recommendations.
    private IQueryable<Product> CardQuery() =>
        _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller).ThenInclude(s => s!.StorePickupAddresses)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings);

    public async Task<PagedProducts<ProductCardDto>> ListProductsAsync(
        Pagination pg, ProductListFilter filter, int? userId)
    {
        var effectiveSortBy = string.IsNullOrEmpty(filter.SortBy) ? "created_at" : filter.SortBy;
        var asc = filter.SortDir == "asc";

        var query = CardQuery().Where(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved);

        // Category — one name or a comma-separated set (OR-matched, case-insensitive).
        var categories = (filter.Category ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(c => c.ToLower())
            .ToList();
        if (categories.Count == 1)
            query = query.Where(p => p.Category != null && p.Category.CategoryName.ToLower() == categories[0]);
        else if (categories.Count > 1)
            query = query.Where(p => p.Category != null && categories.Contains(p.Category.CategoryName.ToLower()));

        // Free-text search over the product name.
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var q = filter.Search.Trim().ToLower();
            query = query.Where(p => p.Productname != null && p.Productname.ToLower().Contains(q));
        }

        // Availability.
        if (filter.InStock == true)
            query = query.Where(p => p.InStock == true && (p.Stock ?? 0) > 0);
        else if (filter.InStock == false)
            query = query.Where(p => p.InStock != true || (p.Stock ?? 0) <= 0);

        // Price band — on the EFFECTIVE selling price (a real discount when Price < Mrp,
        // otherwise the list price), mirroring how the card/UI compute the displayed price.
        if (filter.MinPrice is decimal lo)
            query = query.Where(p =>
                ((p.Mrp != null && p.Price != null && p.Price > 0m && p.Price < p.Mrp) ? p.Price!.Value : (p.Mrp ?? p.Price ?? 0m)) >= lo);
        if (filter.MaxPrice is decimal hi)
            query = query.Where(p =>
                ((p.Mrp != null && p.Price != null && p.Price > 0m && p.Price < p.Mrp) ? p.Price!.Value : (p.Mrp ?? p.Price ?? 0m)) <= hi);

        if (effectiveSortBy == "price")
        {
            // Sort by the same effective selling price so price asc/desc matches the band filter.
            query = asc
                ? query.OrderBy(p => (p.Mrp != null && p.Price != null && p.Price > 0m && p.Price < p.Mrp) ? p.Price!.Value : (p.Mrp ?? p.Price ?? 0m))
                : query.OrderByDescending(p => (p.Mrp != null && p.Price != null && p.Price > 0m && p.Price < p.Mrp) ? p.Price!.Value : (p.Mrp ?? p.Price ?? 0m));
        }
        else
        {
            query = asc ? query.OrderBy(p => p.CreatedAt) : query.OrderByDescending(p => p.CreatedAt);
        }

        var total = await query.CountAsync();
        var products = await query.Skip(pg.Skip).Take(pg.Take).ToListAsync();

        var wishlisted = await GetWishlistedIdsAsync(userId);
        return new PagedProducts<ProductCardDto>
        {
            Items = products.Select(p => MapCard(p, wishlisted)).ToList(),
            Total = total,
            Page = pg.Page,
            Limit = pg.Limit,
        };
    }

    public async Task<PagedProducts<ProductCardDto>> ListFeaturedAsync(Pagination pg, int? userId)
    {
        // The homepage Featured section = PAID promotions first (FIFO queue, capped at the slot count),
        // then topped up with the MOST POPULAR products so it's always full. When nobody is promoting,
        // it's simply the most popular items — never just a thin slice.
        var slots = pg.Take > 0 ? Math.Min(pg.Take, 24) : PromotionService.FeaturedSlots;

        bool IsLive(Product p) =>
            p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true
            && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved;

        var visible = new List<Product>();
        var used = new HashSet<int>();

        // 1) Promoted (paid) products, in queue order, capped at the slot count.
        var promotedIds = (await _promotions.GetActivePromotedProductIdsAsync()).Take(slots).ToList();
        if (promotedIds.Count > 0)
        {
            var promoted = await CardQuery().Where(p => promotedIds.Contains(p.Productid)).ToListAsync();
            foreach (var id in promotedIds)
            {
                var p = promoted.FirstOrDefault(x => x.Productid == id);
                if (p is not null && IsLive(p) && used.Add(p.Productid)) visible.Add(p);
            }
        }

        // 2) Fill remaining slots with the most popular live products (by units sold, then reviews).
        var need = slots - visible.Count;
        if (need > 0)
        {
            var fill = await CardQuery()
                .Where(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true
                    && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved
                    && !used.Contains(p.Productid))
                .OrderByDescending(p => p.StoreOrderItems.Sum(i => i.Quantity))
                .ThenByDescending(p => p.ReviewingAndRatings.Count)
                .ThenByDescending(p => p.CreatedAt)
                .Take(need)
                .ToListAsync();
            foreach (var p in fill) if (used.Add(p.Productid)) visible.Add(p);
        }

        var wishlisted = await GetWishlistedIdsAsync(userId);
        return new PagedProducts<ProductCardDto>
        {
            Items = visible.Select(p => MapCard(p, wishlisted)).ToList(),
            Total = visible.Count,
            Page = 1,
            Limit = slots,
        };
    }

    public async Task<PagedProducts<ProductCardDto>> ListLatestAsync(Pagination pg, int? userId)
    {
        var query = CardQuery().Where(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved).OrderByDescending(p => p.CreatedAt);
        var total = await _db.Products.AsNoTracking().CountAsync(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved);
        var products = await query.Skip(pg.Skip).Take(pg.Take).ToListAsync();

        var wishlisted = await GetWishlistedIdsAsync(userId);
        return new PagedProducts<ProductCardDto>
        {
            Items = products.Select(p => MapCard(p, wishlisted)).ToList(),
            Total = total,
            Page = pg.Page,
            Limit = pg.Limit,
        };
    }

    public async Task<ProductDetailDto> GetProductByIdAsync(string productId, int? userId)
    {
        if (!int.TryParse(productId, out var id))
            throw new NotFoundException("Product");

        var product = await _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller).ThenInclude(s => s!.StorePickupAddresses)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings).ThenInclude(r => r.Enduser).ThenInclude(e => e.Person)
            .Include(p => p.ProductVariants).ThenInclude(v => v.VariantOptions)
            .FirstOrDefaultAsync(p => p.Productid == id);

        if (product is null || product.IsDisabled == true
            || product.Seller is null || product.Seller.IsActive != true
            || product.Seller.StoreStatus != StatusMaps.StoreStatus.Approved)
            throw new NotFoundException("Product");

        var wishlisted = await GetWishlistedIdsAsync(userId);

        var reviews = product.ReviewingAndRatings
            .OrderByDescending(r => r.CreatedAt)
            .ToList();
        var avg = AvgRating(reviews.Select(r => r.Rating));

        var price = product.Mrp.HasValue ? (double)product.Mrp.Value : (double)(product.Price ?? 0m);
        double? offerPrice = product.Mrp.HasValue && product.Price.HasValue ? (double)product.Price.Value : null;

        return new ProductDetailDto
        {
            Id = product.Productid.ToString(),
            Name = product.Productname,
            Images = product.ProductImages
                .Where(i => i.ImageUrl != null)
                .Select(i => new ImageDto { Src = i.ImageUrl!, Width = 800, Height = 800 })
                .ToList(),
            Price = price,
            OfferPrice = offerPrice,
            IsWishlisted = wishlisted.Contains(product.Productid),
            Category = product.Category != null ? new List<string> { product.Category.CategoryName } : new List<string>(),
            Description = product.Description ?? "",
            Size = new List<string>(),
            Stock = product.Stock ?? 0,
            InStock = product.InStock ?? (product.Stock ?? 0) > 0,
            ShippingSize = product.ShippingSize,
            ShippingBulkyCategory = product.ShippingBulkyCategory,
            Store = BuildStoreRef(product.Seller),
            Variants = product.ProductVariants.Count > 0
                ? product.ProductVariants.Select(v => new ProductVariantDto
                {
                    Id = v.VariantId.ToString(),
                    Name = v.VariantName,
                    Options = v.VariantOptions.Select(o => new ProductVariantOptionDto
                    {
                        Id = o.OptionId.ToString(),
                        Value = o.Value,
                        Stock = o.Stock,
                        PriceDelta = o.PriceDelta,
                        Swatch = o.Swatch,
                        ImageUrl = o.ImageUrl,
                    }).ToList(),
                }).ToList()
                : null,
            Reviews = new ProductReviewsDto
            {
                AverageRating = Round1(avg),
                TotalReviews = reviews.Count,
                Items = reviews.Select(r => new ReviewDto
                {
                    Id = $"{r.Enduserid}_{r.Productid}",
                    Rating = r.Rating,
                    Text = r.Comment ?? "",
                    UserName = JoinName(r.Enduser?.Person?.FirstName, r.Enduser?.Person?.LastName, fallback: "Anonymous"),
                    Date = r.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                }).ToList(),
            },
        };
    }

    internal static string JoinName(string? first, string? last, string fallback = "")
    {
        var name = string.Join(" ", new[] { first, last }.Where(s => !string.IsNullOrWhiteSpace(s)));
        return string.IsNullOrWhiteSpace(name) ? fallback : name;
    }

    /// <summary>Trim a description to a short snippet for list/search payloads (AI semantic context).</summary>
    internal static string? Truncate(string? text, int max)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var t = text.Trim();
        return t.Length <= max ? t : t.Substring(0, max).TrimEnd() + "…";
    }
}
