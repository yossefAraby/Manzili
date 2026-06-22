using Manzili.Application.Account;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/notification.service.js (list + markAsRead) plus a
/// reusable create path so the order/shipment/return/payout flows can notify users.</summary>
public sealed class NotificationService
{
    private readonly ManziliDbContext _db;

    public NotificationService(ManziliDbContext db) => _db = db;

    /// <summary>Create a notification for a person (no-op if personId is invalid).</summary>
    public async Task<int> CreateAsync(int personId, string title, string message, string type = "system", string? href = null)
    {
        if (personId <= 0) return 0;
        var notification = new Notification
        {
            Personid = personId,
            Tittle = title,
            Notificationcontent = message,
            Type = type,
            Href = href ?? "",
            IsRead = false,
            // notification.created_at is `timestamp without time zone` → Unspecified Kind
            // (writing Kind=Utc throws on Npgsql, same gotcha as coupons/reports). This path
            // is shared by every notification (orders, shipping, returns, verification…).
            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();
        return notification.NotificationId;
    }

    /// <summary>Notify the person who owns a seller account.</summary>
    public async Task NotifySellerAsync(int sellerId, string title, string message, string type = "system", string? href = null)
    {
        var personId = await _db.Sellers.AsNoTracking()
            .Where(s => s.Sellerid == sellerId)
            .Select(s => s.Personid)
            .FirstOrDefaultAsync();
        if (personId != 0) await CreateAsync(personId, title, message, type, href);
    }

    /// <summary>Notify the person behind an end-user (buyer) account.</summary>
    public async Task NotifyEnduserAsync(int enduserId, string title, string message, string type = "system", string? href = null)
    {
        var personId = await _db.Endusers.AsNoTracking()
            .Where(e => e.Enduserid == enduserId)
            .Select(e => (int?)e.Personid)
            .FirstOrDefaultAsync();
        if (personId is int pid && pid != 0) await CreateAsync(pid, title, message, type, href);
    }

    public async Task<NotificationsResult> ListNotificationsAsync(int personId)
    {
        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(n => n.Personid == personId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        var unreadCount = notifications.Count(n => !(n.IsRead ?? false));

        return new NotificationsResult
        {
            Items = notifications.Select(n => new NotificationDto
            {
                Id = n.NotificationId.ToString(),
                Type = n.Type ?? "system",
                Title = n.Tittle,
                Message = n.Notificationcontent,
                Href = n.Href ?? "",
                IsRead = n.IsRead ?? false,
                CreatedAt = DateTime.SpecifyKind(n.CreatedAt, DateTimeKind.Utc).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            }).ToList(),
            UnreadCount = unreadCount,
        };
    }

    public async Task<string> MarkAsReadAsync(int personId, int notificationId)
    {
        // updateMany semantics: scoped to the owner, no error if nothing matches.
        await _db.Notifications
            .Where(n => n.NotificationId == notificationId && n.Personid == personId)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, (bool?)true));

        return "Marked as read";
    }
}
