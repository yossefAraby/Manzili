using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Notification
{
    public int NotificationId { get; set; }

    public string Tittle { get; set; } = null!;

    public string Notificationcontent { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public bool? IsRead { get; set; }

    public int Personid { get; set; }

    public string? Type { get; set; }

    public string? Href { get; set; }

    public virtual Person Person { get; set; } = null!;
}
