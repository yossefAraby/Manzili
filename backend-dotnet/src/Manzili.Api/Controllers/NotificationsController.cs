using Manzili.Api.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Authorize]
[Route("api/v1/notifications")]
public sealed class NotificationsController : ApiController
{
    private readonly NotificationService _notifications;

    public NotificationsController(NotificationService notifications) => _notifications = notifications;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var data = await _notifications.ListNotificationsAsync(RequirePersonId);
        return ApiOk(data);
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var message = await _notifications.MarkAsReadAsync(RequirePersonId, id);
        return ApiMessage(message);
    }
}
