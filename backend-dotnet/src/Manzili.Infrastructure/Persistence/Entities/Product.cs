using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Product
{
    public int Productid { get; set; }

    public string Productname { get; set; } = null!;

    public byte[]? Cover { get; set; }

    public short? Categoryid { get; set; }

    public int? Sellerid { get; set; }

    public string? Description { get; set; }

    public decimal? Price { get; set; }

    public decimal? Mrp { get; set; }

    public int? Stock { get; set; }

    public bool? InStock { get; set; }

    public string? CoverUrl { get; set; }

    public string? ShippingSize { get; set; }

    public string? ShippingBulkyCategory { get; set; }

    public bool? IsDisabled { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<CartContain> CartContains { get; set; } = new List<CartContain>();

    public virtual Category? Category { get; set; }

    public virtual ICollection<ConsistOf> ConsistOfs { get; set; } = new List<ConsistOf>();

    public virtual ICollection<CouponProduct> CouponProducts { get; set; } = new List<CouponProduct>();

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    public virtual ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();

    public virtual ICollection<ReviewingAndRating> ReviewingAndRatings { get; set; } = new List<ReviewingAndRating>();

    public virtual Seller? Seller { get; set; }

    public virtual ICollection<StoreOrderItem> StoreOrderItems { get; set; } = new List<StoreOrderItem>();

    public virtual ICollection<Wishlist> Wichlists { get; set; } = new List<Wishlist>();
}
