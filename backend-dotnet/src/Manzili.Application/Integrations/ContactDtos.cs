namespace Manzili.Application.Integrations;

/// <summary>Body for POST /api/v1/contact (contact-us form).</summary>
public sealed class ContactRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Subject { get; set; }
    public string? Message { get; set; }
}

/// <summary>Body for POST /api/v1/newsletter (footer subscribe).</summary>
public sealed class NewsletterRequest
{
    public string? Email { get; set; }
}
