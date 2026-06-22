using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Offer
{
    public int OfferId { get; set; }

    public int Requestid { get; set; }

    public int Sellerid { get; set; }

    public decimal Price { get; set; }

    public string? Description { get; set; }

    public string Status { get; set; } = null!;

    public string? SellerComment { get; set; }

    public string? BuyerComment { get; set; }

    public DateTime? AcceptedAt { get; set; }

    public DateTime? FirstPaidAt { get; set; }

    public DateTime? ProgressUploadedAt { get; set; }

    public DateTime? SecondPaidAt { get; set; }

    public DateTime? ReadyToShipAt { get; set; }

    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<OfferMessage> OfferMessages { get; set; } = new List<OfferMessage>();

    public virtual ICollection<OfferPayment> OfferPayments { get; set; } = new List<OfferPayment>();

    public virtual CustomRequest Request { get; set; } = null!;

    public virtual Seller Seller { get; set; } = null!;
}
