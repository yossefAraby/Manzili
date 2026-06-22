using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/search.service.js.</summary>
public sealed class SearchService
{
    private readonly ManziliDbContext _db;
    private readonly ProductService _products;

    public SearchService(ManziliDbContext db, ProductService products)
    {
        _db = db;
        _products = products;
    }

    public async Task<(IReadOnlyList<SearchProductDto> Products, int Total)> SearchAsync(
        string? q, Pagination pg, int? userId)
    {
        if (string.IsNullOrWhiteSpace(q))
            return (new List<SearchProductDto>(), 0);

        var term = q;
        var query = _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings)
            .Where(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved)
            .Where(p =>
                EF.Functions.ILike(p.Productname, $"%{term}%") ||
                (p.Description != null && EF.Functions.ILike(p.Description, $"%{term}%")))
            .OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync();
        var products = await query.Skip(pg.Skip).Take(pg.Take).ToListAsync();

        var wishlisted = await _products.GetWishlistedIdsAsync(userId);

        var mapped = products.Select(p =>
        {
            var ratings = p.ReviewingAndRatings.Select(r => r.Rating).ToList();
            var avg = ratings.Count > 0 ? ratings.Average() : 0;
            var price = p.Mrp.HasValue ? (double)p.Mrp.Value : (double)(p.Price ?? 0m);
            double? offerPrice = p.Mrp.HasValue && p.Price.HasValue ? (double)p.Price.Value : null;

            return new SearchProductDto
            {
                Id = p.Productid.ToString(),
                Name = p.Productname,
                Images = p.ProductImages
                    .Where(i => i.ImageUrl != null)
                    .Select(i => i.ImageUrl!)
                    .Take(1)
                    .ToList(),
                Price = price,
                OfferPrice = offerPrice,
                Rating = Math.Round(avg * 10) / 10,
                ReviewCount = p.ReviewingAndRatings.Count,
                IsWishlisted = wishlisted.Contains(p.Productid),
                Category = p.Category?.CategoryName ?? "",
                InStock = p.InStock ?? true,
                Stock = p.Stock ?? 0,
                Store = p.Seller != null
                    ? new StoreRefDto { Id = p.Seller.Sellerid.ToString(), Name = p.Seller.Storename ?? "" }
                    : null,
            };
        }).ToList();

        return (mapped, total);
    }
}
