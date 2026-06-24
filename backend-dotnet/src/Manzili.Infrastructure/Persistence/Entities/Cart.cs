using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Cart
{
    public int Cartid { get; set; }

    public int? Creatorid { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>Variant-faithful JSON snapshot of the active cart lines (added by SchemaMigrator).</summary>
    public string? ItemsJson { get; set; }

    public virtual ICollection<CartContain> CartContains { get; set; } = new List<CartContain>();

    public virtual Person? Creator { get; set; }
}
