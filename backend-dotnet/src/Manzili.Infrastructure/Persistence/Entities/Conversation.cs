using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Conversation
{
    public int Conversationid { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? Lastmessageat { get; set; }

    public int Enduserid { get; set; }

    public int Sellerid { get; set; }

    public virtual Enduser Enduser { get; set; } = null!;

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual Seller Seller { get; set; } = null!;
}
