using System.Net;
using System.Net.Mail;
using Manzili.Application.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Sends transactional email over SMTP (contact form + newsletter). When email isn't configured
/// (<see cref="EmailOptions.IsConfigured"/> is false) sends are logged and skipped, so the forms
/// still succeed in the demo without real credentials.
/// </summary>
public sealed class EmailService
{
    private readonly EmailOptions _opt;
    private readonly ILogger<EmailService> _log;

    public EmailService(IOptions<AppOptions> options, ILogger<EmailService> log)
    {
        _opt = options.Value.Email;
        _log = log;
    }

    public bool IsConfigured => _opt.IsConfigured;
    public string? ContactRecipient => _opt.ContactRecipient ?? _opt.FromAddress;

    public async Task<bool> SendAsync(string toEmail, string subject, string body, string? replyTo = null)
    {
        if (!_opt.IsConfigured)
        {
            _log.LogInformation("Email not configured — skipped send to {To} (subject: {Subject})", toEmail, subject);
            return false;
        }
        if (string.IsNullOrWhiteSpace(toEmail)) return false;

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_opt.FromAddress!, _opt.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = false,
            };
            message.To.Add(toEmail);
            if (!string.IsNullOrWhiteSpace(replyTo)) message.ReplyToList.Add(new MailAddress(replyTo));

            using var client = new SmtpClient(_opt.Host, _opt.Port)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(_opt.User, _opt.Password),
            };
            await client.SendMailAsync(message);
            return true;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Email send to {To} failed", toEmail);
            return false;
        }
    }
}
