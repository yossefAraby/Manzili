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

    public ProductService(ManziliDbContext db)
    {
        _db = db;
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
            InStock = p.InStock ?? true,
            Stock = p.Stock ?? 0,
            Store = p.Seller != null
                ? new StoreRefDto { Id = p.Seller.Sellerid.ToString(), Name = p.Seller.Storename ?? "", Username = p.Seller.Username }
                : null,
        };
    }

    // Mirrors Node productInclude (category, seller, first 5 images, ratings).
    private IQueryable<Product> CardQuery() =>
        _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller)
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
        // Node: take page slice ordered by created_at desc, then sort that slice by avg rating desc.
        var products = await CardQuery()
            .Where(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved)
            .OrderByDescending(p => p.CreatedAt)
            .Skip(pg.Skip)
            .Take(pg.Take)
            .ToListAsync();

        products = products
            .OrderByDescending(p => AvgRating(p.ReviewingAndRatings.Select(r => r.Rating)))
            .ToList();

        var total = await _db.Products.AsNoTracking().CountAsync(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved);
        var wishlisted = await GetWishlistedIdsAsync(userId);

        return new PagedProducts<ProductCardDto>
        {
            Items = products.Select(p => MapCard(p, wishlisted)).ToList(),
            Total = total,
            Page = pg.Page,
            Limit = pg.Limit,
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
            .Include(p => p.Seller)
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
            Store = product.Seller != null
                ? new StoreRefDto { Id = product.Seller.Sellerid.ToString(), Name = product.Seller.Storename ?? "", Username = product.Seller.Username }
                : null,
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
}
