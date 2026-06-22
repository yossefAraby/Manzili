using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Return
{
    public int Returnid { get; set; }

    public string Reason { get; set; } = null!;

    public short? Status { get; set; }

    public DateTime Requestdate { get; set; }

    public int Orderid { get; set; }

    public int? StoreOrderid { get; set; }

    public decimal? RefundAmount { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual ICollection<ProofAsImage> ProofAsImages { get; set; } = new List<ProofAsImage>();

    public virtual StoreOrder? StoreOrder { get; set; }
}
