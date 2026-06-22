using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class ColorPalette
{
    public int ColorPaletteid { get; set; }

    public string ColorCode { get; set; } = null!;

    public string ColorDescription { get; set; } = null!;

    public int Requestid { get; set; }

    public virtual CustomRequest Request { get; set; } = null!;
}
