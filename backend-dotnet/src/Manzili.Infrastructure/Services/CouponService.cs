using Manzili.Application.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/coupon.service.js.</summary>
public sealed class CouponService
{
    private readonly ManziliDbContext _db;

    public CouponService(ManziliDbContext db) => _db = db;

    private static CouponDto MapCoupon(Coupon c) => new()
    {
        Id = c.Couponid.ToString(),
        Code = c.Code ?? "",
        Discount = (double)(c.DiscountPercentage ?? 0m),
        Description = c.Description ?? "",
        Scope = StatusMaps.CouponScope.TryGetValue(c.Scope, out var s) ? s : "STORE",
        MaxUsers = c.MaxUsers ?? 100,
        UsedCount = c.UsedCount ?? 0,
        ExpiryDate = ToIso(c.ExpiredDate),
        IsActive = c.Status ?? true,
    };

    public async Task<CouponsResult> ListCouponsAsync(int sellerid)
    {
        var coupons = await _db.Coupons
            .AsNoTracking()
            .Where(c => c.Storeid == sellerid)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return new CouponsResult { Coupons = coupons.Select(MapCoupon).ToList() };
    }

    public async Task<CouponDto> CreateCouponAsync(int personid, int sellerid, CreateCouponRequest body)
    {
        var scopeInt = (short)(body.Scope is not null
            && StatusMaps.CouponScopeCreate.TryGetValue(body.Scope.ToUpperInvariant(), out var sc)
                ? sc
                : 10);

        var coupon = new Coupon
        {
            Code = body.Code,
            Description = body.Description ?? "",
            DiscountPercentage = body.Discount,
            Scope = scopeInt,
            Creatorid = personid,
            Storeid = sellerid,
            MaxUsers = body.MaxUsers ?? 100,
            ExpiredDate = ParseDate(body.ExpiryDate),
            // coupons.created_at is `timestamp without time zone` → use Unspecified Kind.
            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
        };
        _db.Coupons.Add(coupon);
        await _db.SaveChangesAsync();

        if (body.ProductIds is { Count: > 0 })
        {
            foreach (var pid in body.ProductIds)
            {
                if (int.TryParse(pid, out var productId))
                {
                    _db.CouponProducts.Add(new CouponProduct
                    {
                        Couponid = coupon.Couponid,
                        Productid = productId,
                    });
                }
            }
            await _db.SaveChangesAsync();
        }

        return MapCoupon(coupon);
    }

    public async Task<string> DeleteCouponAsync(int sellerid, int couponId)
    {
        var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Couponid == couponId)
            ?? throw new NotFoundException("Coupon");
        if (coupon.Storeid != sellerid) throw new ForbiddenException("Not your coupon");

        _db.Coupons.Remove(coupon);
        await _db.SaveChangesAsync();
        return "Coupon deleted";
    }

    public async Task<ValidateCouponResult> ValidateCouponAsync(ValidateCouponRequest body)
    {
        var coupon = await _db.Coupons
            .AsNoTracking()
            .Include(c => c.CouponProducts)
            .FirstOrDefaultAsync(c => c.Code == body.Code && c.Status == true)
            ?? throw new ValidationAppException("Invalid coupon code");

        if (coupon.ExpiredDate is not null && coupon.ExpiredDate < DateTime.UtcNow)
            throw new ValidationAppException("Coupon expired");
        if (coupon.MaxUsers is not null && (coupon.UsedCount ?? 0) >= coupon.MaxUsers)
            throw new ValidationAppException("Coupon usage limit reached");

        return new ValidateCouponResult
        {
            Valid = true,
            Code = coupon.Code,
            Discount = (double)(coupon.DiscountPercentage ?? 0m),
            Scope = StatusMaps.CouponScope.TryGetValue(coupon.Scope, out var s) ? s : "STORE",
            ProductIds = coupon.CouponProducts.Select(cp => cp.Productid.ToString()).ToList(),
            ExpiryDate = ToIso(coupon.ExpiredDate),
            MaxUsers = coupon.MaxUsers ?? 100,
        };
    }

    // Returns an Unspecified-Kind DateTime (coupons.expired_date is `timestamp without time zone`).
    private static DateTime? ParseDate(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : DateTime.SpecifyKind(
                DateTime.Parse(value, null,
                    System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal),
                DateTimeKind.Unspecified);

    private static string? ToIso(DateTime? dt)
    {
        if (dt is null) return null;
        var value = dt.Value;
        if (value.Kind == DateTimeKind.Unspecified)
            value = DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
    }
}
