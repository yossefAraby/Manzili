using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Payout
{
    public int Payoutid { get; set; }

    public decimal? Amount { get; set; }

    public int? Status { get; set; }

    public DateTime? RequestAtTime { get; set; }

    public DateTime? PaidAt { get; set; }

    public int? Sellerid { get; set; }

    public virtual Seller? Seller { get; set; }
}
