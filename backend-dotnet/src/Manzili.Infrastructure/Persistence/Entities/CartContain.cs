using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class CartContain
{
    public int? NumberOfProducts { get; set; }

    public int Cartid { get; set; }

    public int Productid { get; set; }

    public virtual Cart Cart { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
