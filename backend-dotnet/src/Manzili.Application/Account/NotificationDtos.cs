namespace Manzili.Application.Account;

/// <summary>Single notification item, mirrors Node services/notification.service.js.</summary>
public sealed class NotificationDto
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "system";
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string Href { get; set; } = "";
    public bool IsRead { get; set; }
    public string CreatedAt { get; set; } = "";
}

/// <summary>Data payload for GET /api/v1/notifications.</summary>
public sealed class NotificationsResult
{
    public List<NotificationDto> Items { get; set; } = new();
    public int UnreadCount { get; set; }
}
