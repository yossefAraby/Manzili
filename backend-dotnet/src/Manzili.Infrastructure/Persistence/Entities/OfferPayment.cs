using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class OfferPayment
{
    public int PaymentId { get; set; }

    public int OfferId { get; set; }

    public string Milestone { get; set; } = null!;

    public decimal Amount { get; set; }

    public string PaymentMethod { get; set; } = null!;

    public int? AddressId { get; set; }

    public DateTime PaidAt { get; set; }

    public virtual Address? Address { get; set; }

    public virtual Offer Offer { get; set; } = null!;
}
