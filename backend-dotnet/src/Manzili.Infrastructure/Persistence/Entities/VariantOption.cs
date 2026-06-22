using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class VariantOption
{
    public int OptionId { get; set; }

    public int VariantId { get; set; }

    public string Value { get; set; } = null!;

    public int Stock { get; set; }

    /// <summary>Per-option price adjustment added to the product's base price/mrp (Noon-style "+EGP"). Defaults to 0.</summary>
    public decimal PriceDelta { get; set; }

    /// <summary>Hex swatch (#RRGGBB) for color options; null for non-color groups.</summary>
    public string? Swatch { get; set; }

    /// <summary>Optional hosted image URL shown when this option is selected.</summary>
    public string? ImageUrl { get; set; }

    public virtual ProductVariant Variant { get; set; } = null!;
}
