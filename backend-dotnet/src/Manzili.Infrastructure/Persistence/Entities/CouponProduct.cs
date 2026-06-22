using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class CouponProduct
{
    public int CouponProductid { get; set; }

    public int Couponid { get; set; }

    public int Productid { get; set; }

    public virtual Coupon Coupon { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
