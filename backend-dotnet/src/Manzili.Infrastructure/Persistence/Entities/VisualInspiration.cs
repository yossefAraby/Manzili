using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class VisualInspiration
{
    public int Imageid { get; set; }

    public byte[]? TheImage { get; set; }

    public string? Imageurl { get; set; }

    public int Requestid { get; set; }

    public virtual CustomRequest Request { get; set; } = null!;
}
