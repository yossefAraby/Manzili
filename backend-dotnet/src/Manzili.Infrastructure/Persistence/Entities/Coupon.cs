using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Coupon
{
    public int Couponid { get; set; }

    public string Description { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public bool? Status { get; set; }

    public DateTime? ExpiredDate { get; set; }

    public short Scope { get; set; }

    public int Creatorid { get; set; }

    public int? Storeid { get; set; }

    public string? Code { get; set; }

    public decimal? DiscountPercentage { get; set; }

    public int? MaxUsers { get; set; }

    public int? UsedCount { get; set; }

    public virtual ICollection<CouponProduct> CouponProducts { get; set; } = new List<CouponProduct>();

    public virtual Person Creator { get; set; } = null!;

    public virtual Seller? Store { get; set; }

    public virtual ICollection<UserCoupon> UserCoupons { get; set; } = new List<UserCoupon>();
}
