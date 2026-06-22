using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Follow
{
    public DateOnly? FollowedAt { get; set; }

    public int Enduserid { get; set; }

    public int Sellerid { get; set; }

    public virtual Enduser Enduser { get; set; } = null!;

    public virtual Seller Seller { get; set; } = null!;
}
