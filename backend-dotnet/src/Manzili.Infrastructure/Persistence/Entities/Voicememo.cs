using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Voicememo
{
    public int Recordingid { get; set; }

    public double? Duration { get; set; }

    public DateTime? SendAt { get; set; }

    public byte[]? Record { get; set; }

    public int Requestid { get; set; }

    public virtual CustomRequest Request { get; set; } = null!;
}
