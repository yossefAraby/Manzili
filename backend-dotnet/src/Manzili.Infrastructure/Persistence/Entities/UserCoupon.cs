using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class UserCoupon
{
    public int UsedCouponid { get; set; }

    public DateTime UsedAt { get; set; }

    public int Couponid { get; set; }

    public int Userid { get; set; }

    public int Orderid { get; set; }

    public virtual Coupon Coupon { get; set; } = null!;

    public virtual Order Order { get; set; } = null!;

    public virtual Person User { get; set; } = null!;
}
