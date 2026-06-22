using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class ConsistOf
{
    public int Quantity { get; set; }

    public decimal PriceAtPurchase { get; set; }

    public int Orderid { get; set; }

    public int Productid { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
