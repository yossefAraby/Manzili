using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Category
{
    public short Categoryid { get; set; }

    public string CategoryName { get; set; } = null!;

    public virtual ICollection<CustomRequest> CustomRequests { get; set; } = new List<CustomRequest>();

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
