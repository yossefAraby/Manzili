using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Wishlist
{
    public int Wichlistid { get; set; }

    public int? Numberofproducts { get; set; }

    public virtual ICollection<Enduser> Endusers { get; set; } = new List<Enduser>();

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
