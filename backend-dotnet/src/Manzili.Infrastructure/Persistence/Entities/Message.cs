using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Message
{
    public int Messageid { get; set; }

    public string Messagecontent { get; set; } = null!;

    public DateTime SentAt { get; set; }

    public bool? Isread { get; set; }

    public int Conversationid { get; set; }

    public virtual Conversation Conversation { get; set; } = null!;
}
