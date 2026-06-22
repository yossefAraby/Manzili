using Manzili.Application.Account;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/wishlist.service.js.</summary>
public sealed class WishlistService
{
    private readonly ManziliDbContext _db;

    public WishlistService(ManziliDbContext db) => _db = db;

    // The whishlist_contain join table is a skip-navigation m2m with no entity class.
    private DbSet<Dictionary<string, object>> Contains =>
        _db.Set<Dictionary<string, object>>("WhishlistContain");

    /// <summary>Mirrors Node ensureWishlist(): creates a wishlist for the enduser if absent.</summary>
    private async Task<int> EnsureWishlistAsync(int personId)
    {
        var enduser = await _db.Endusers.FirstOrDefaultAsync(e => e.Personid == personId)
            ?? throw new NotFoundException("User");

        if (enduser.Wichlistid is int existing) return existing;

        var wishlist = new Wishlist { Numberofproducts = 0 };
        _db.Wishlists.Add(wishlist);
        await _db.SaveChangesAsync();

        enduser.Wichlistid = wishlist.Wichlistid;
        await _db.SaveChangesAsync();

        return wishlist.Wichlistid;
    }

    public async Task<WishlistResult> GetWishlistAsync(int personId)
    {
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        if (enduser?.Wichlistid is not int wichlistid)
            return new WishlistResult { WishlistCards = new(), Total = 0 };

        var products = await _db.Products
            .AsNoTracking()
            .Where(p => p.Wichlists.Any(w => w.Wichlistid == wichlistid))
            .Include(p => p.Category)
            .Include(p => p.Seller)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings)
            .ToListAsync();

        var cards = products.Select(p =>
        {
            var ratings = p.ReviewingAndRatings;
            var avgRating = ratings.Count > 0 ? ratings.Average(r => r.Rating) : 0d;
            var mainImage = p.CoverUrl ?? p.ProductImages.FirstOrDefault()?.ImageUrl;

            return new WishlistCardDto
            {
                Id = p.Productid.ToString(),
                Name = p.Productname,
                MainImage = mainImage is not null
                    ? new CardImageDto { Src = mainImage, Width = 400, Height = 400 }
                    : null,
                // Node: price = mrp ?? (price ?? 0); offerPrice = (mrp && price) ? price : null
                Price = p.Mrp ?? p.Price ?? 0m,
                OfferPrice = (p.Mrp is not null && p.Price is not null) ? p.Price : null,
                Rating = Math.Round(avgRating * 10) / 10,
                ReviewCount = ratings.Count,
                IsWishlisted = true,
                Category = p.Category is not null ? new List<string> { p.Category.CategoryName } : new(),
                InStock = p.InStock ?? true,
                Store = p.Seller is not null
                    ? new CardStoreDto { Id = p.Seller.Sellerid.ToString(), Name = p.Seller.Storename ?? "" }
                    : null,
            };
        }).ToList();

        return new WishlistResult { WishlistCards = cards, Total = cards.Count };
    }

    public async Task<string> AddToWishlistAsync(int personId, int productId)
    {
        var wichlistid = await EnsureWishlistAsync(personId);

        var exists = await _db.Products.AsNoTracking().AnyAsync(p => p.Productid == productId);
        if (!exists) throw new NotFoundException("Product");

        // Upsert: skip if the (wichlistid, productid) row already exists.
        var already = await Contains.AnyAsync(c =>
            EF.Property<int>(c, "Wichlistid") == wichlistid && EF.Property<int>(c, "Productid") == productId);
        if (!already)
        {
            Contains.Add(new Dictionary<string, object>
            {
                ["Wichlistid"] = wichlistid,
                ["Productid"] = productId,
            });
            await _db.SaveChangesAsync();
        }

        return "Added to wishlist";
    }

    public async Task<string> RemoveFromWishlistAsync(int personId, int productId)
    {
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        if (enduser?.Wichlistid is not int wichlistid)
            return "Removed from wishlist";

        await Contains
            .Where(c => EF.Property<int>(c, "Wichlistid") == wichlistid && EF.Property<int>(c, "Productid") == productId)
            .ExecuteDeleteAsync();

        return "Removed from wishlist";
    }

    public async Task<string> ClearWishlistAsync(int personId)
    {
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        if (enduser?.Wichlistid is not int wichlistid)
            return "Wishlist cleared";

        await Contains
            .Where(c => EF.Property<int>(c, "Wichlistid") == wichlistid)
            .ExecuteDeleteAsync();

        return "Wishlist cleared";
    }
}
