using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Person
{
    public int Personid { get; set; }

    public string Email { get; set; } = null!;

    public string Password { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? ImageUrl { get; set; }

    public string? RefreshToken { get; set; }

    public virtual ICollection<Address> Addresses { get; set; } = new List<Address>();

    public virtual ICollection<Cart> Carts { get; set; } = new List<Cart>();

    public virtual ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();

    public virtual Enduser? Enduser { get; set; }

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<PersonPermission> PersonPermissions { get; set; } = new List<PersonPermission>();

    public virtual ICollection<Report> Reports { get; set; } = new List<Report>();

    public virtual Seller? Seller { get; set; }

    public virtual Systemadmin? Systemadmin { get; set; }

    public virtual ICollection<UserCoupon> UserCoupons { get; set; } = new List<UserCoupon>();
}
