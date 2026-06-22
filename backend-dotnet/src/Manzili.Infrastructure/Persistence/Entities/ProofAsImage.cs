using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class ProofAsImage
{
    public int Imageid { get; set; }

    public string? EvidenceUrl { get; set; }

    public byte[]? TheImage { get; set; }

    public int Returnid { get; set; }

    public virtual Return Return { get; set; } = null!;
}
