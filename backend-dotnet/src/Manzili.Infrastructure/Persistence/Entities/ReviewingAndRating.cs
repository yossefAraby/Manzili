using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class ReviewingAndRating
{
    public double Rating { get; set; }

    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; }

    public int Enduserid { get; set; }

    public int Productid { get; set; }

    public int? Orderid { get; set; }

    public virtual Enduser Enduser { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
