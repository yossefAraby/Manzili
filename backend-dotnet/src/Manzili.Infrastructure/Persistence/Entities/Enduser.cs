using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Enduser
{
    public int Enduserid { get; set; }

    public int? Wichlistid { get; set; }

    public int Personid { get; set; }

    public virtual ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();

    public virtual ICollection<CustomRequest> CustomRequests { get; set; } = new List<CustomRequest>();

    public virtual ICollection<Follow> Follows { get; set; } = new List<Follow>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual Person Person { get; set; } = null!;

    public virtual ICollection<ReviewingAndRating> ReviewingAndRatings { get; set; } = new List<ReviewingAndRating>();

    public virtual Wishlist? Wichlist { get; set; }
}
