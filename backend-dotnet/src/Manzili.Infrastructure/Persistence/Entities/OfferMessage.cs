using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class OfferMessage
{
    public int MessageId { get; set; }

    public int OfferId { get; set; }

    public string AuthorType { get; set; } = null!;

    public int AuthorId { get; set; }

    public string Text { get; set; } = null!;

    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Offer Offer { get; set; } = null!;
}
