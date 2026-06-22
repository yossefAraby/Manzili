using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class ProductVariant
{
    public int VariantId { get; set; }

    public int Productid { get; set; }

    public string VariantName { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;

    public virtual ICollection<VariantOption> VariantOptions { get; set; } = new List<VariantOption>();
}
