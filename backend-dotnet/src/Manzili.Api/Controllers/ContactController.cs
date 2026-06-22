using Manzili.Api.Common;
using Manzili.Application.Common;
using Manzili.Application.Integrations;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>Contact-us + newsletter. Anonymous; emails are sent when SMTP is configured, otherwise
/// the request is accepted and logged (so the demo forms still work).</summary>
[Route("api/v1")]
[AllowAnonymous]
public sealed class ContactController : ApiController
{
    private readonly EmailService _email;

    public ContactController(EmailService email) => _email = email;

    [HttpPost("contact")]
    public async Task<IActionResult> Contact([FromBody] ContactRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Message))
            throw new ValidationAppException("Email and message are required");

        var to = _email.ContactRecipient;
        var subject = $"[Manzili contact] {(string.IsNullOrWhiteSpace(body.Subject) ? "New message" : body.Subject)}";
        var text = $"From: {body.Name} <{body.Email}>\nSubject: {body.Subject}\n\n{body.Message}";
        var emailed = !string.IsNullOrWhiteSpace(to) && await _email.SendAsync(to!, subject, text, replyTo: body.Email);

        return ApiOk(new { received = true, emailed });
    }

    [HttpPost("newsletter")]
    public async Task<IActionResult> Newsletter([FromBody] NewsletterRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Email))
            throw new ValidationAppException("Email is required");

        var emailed = await _email.SendAsync(
            body.Email!,
            "Welcome to Manzili",
            "Thanks for subscribing to Manzili — where real craft finds its home. We'll share new artisans and handmade finds with you.");

        var to = _email.ContactRecipient;
        if (!string.IsNullOrWhiteSpace(to))
            await _email.SendAsync(to!, "New newsletter subscriber", $"New subscriber: {body.Email}");

        return ApiOk(new { received = true, emailed });
    }
}
