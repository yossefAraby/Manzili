using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Seller
{
    public int Sellerid { get; set; }

    public string? Storename { get; set; }

    public string? StoreDescription { get; set; }

    public byte[]? Storelogo { get; set; }

    public decimal? SellerwalletBalance { get; set; }

    public int Personid { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? AddressText { get; set; }

    public string? Username { get; set; }

    public string? StoreStatus { get; set; }

    public bool? IsActive { get; set; }

    public string? LogoUrl { get; set; }

    /// <summary>Hosted URL of the owner's national-ID card photo, submitted on apply for admin verification review.</summary>
    public string? NationalIdImageUrl { get; set; }

    public string? BostaPickupLocationId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();

    public virtual ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();

    public virtual ICollection<CustomRequest> CustomRequests { get; set; } = new List<CustomRequest>();

    public virtual ICollection<Follow> Follows { get; set; } = new List<Follow>();

    public virtual ICollection<Offer> Offers { get; set; } = new List<Offer>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Payout> Payouts { get; set; } = new List<Payout>();

    public virtual Person Person { get; set; } = null!;

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    public virtual ICollection<Report> Reports { get; set; } = new List<Report>();

    public virtual SellerWallet? SellerWallet { get; set; }

    public virtual ICollection<StoreOrder> StoreOrders { get; set; } = new List<StoreOrder>();

    public virtual ICollection<StorePickupAddress> StorePickupAddresses { get; set; } = new List<StorePickupAddress>();
}
