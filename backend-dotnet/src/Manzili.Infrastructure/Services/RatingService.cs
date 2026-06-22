using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/rating.service.js.</summary>
public sealed class RatingService
{
    private readonly ManziliDbContext _db;

    public RatingService(ManziliDbContext db)
    {
        _db = db;
    }

    public async Task<ReviewDto> CreateRatingAsync(int personId, CreateRatingRequest req)
    {
        if (!int.TryParse(req.ProductId, out var productId))
            throw new NotFoundException("Product");

        var enduser = await _db.Endusers.FirstOrDefaultAsync(e => e.Personid == personId)
            ?? throw new NotFoundException("User");

        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Productid == productId)
            ?? throw new NotFoundException("Product");

        var existing = await _db.ReviewingAndRatings.AsNoTracking()
            .AnyAsync(r => r.Enduserid == enduser.Enduserid && r.Productid == productId);
        if (existing) throw new ConflictException("Already reviewed this product");

        var entity = new ReviewingAndRating
        {
            Enduserid = enduser.Enduserid,
            Productid = productId,
            Rating = req.Rating,
            Comment = string.IsNullOrEmpty(req.Review) ? null : req.Review,
            Orderid = int.TryParse(req.OrderId, out var oid) ? oid : null,
            CreatedAt = DateTime.UtcNow,
        };
        _db.ReviewingAndRatings.Add(entity);
        await _db.SaveChangesAsync();

        var person = await _db.People.AsNoTracking().FirstOrDefaultAsync(p => p.Personid == personId);

        return new ReviewDto
        {
            Id = $"{entity.Enduserid}_{entity.Productid}",
            Rating = entity.Rating,
            Text = entity.Comment ?? "",
            UserName = ProductService.JoinName(person?.FirstName, person?.LastName),
            Date = entity.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        };
    }

    public async Task<IReadOnlyList<ReviewDto>> ListRatingsAsync(string productId)
    {
        if (!int.TryParse(productId, out var pid))
            return new List<ReviewDto>();

        var ratings = await _db.ReviewingAndRatings.AsNoTracking()
            .Include(r => r.Enduser).ThenInclude(e => e.Person)
            .Where(r => r.Productid == pid)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return ratings.Select(r => new ReviewDto
        {
            Id = $"{r.Enduserid}_{r.Productid}",
            Rating = r.Rating,
            Text = r.Comment ?? "",
            UserName = ProductService.JoinName(r.Enduser?.Person?.FirstName, r.Enduser?.Person?.LastName),
            Date = r.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
        }).ToList();
    }
}
