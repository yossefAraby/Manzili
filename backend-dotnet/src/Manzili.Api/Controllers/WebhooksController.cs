using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Manzili.Api.Controllers;

/// <summary>
/// Port of Node routes/webhook.routes.js. Both endpoints are anonymous and return PLAIN
/// JSON bodies (not the standard success/error envelope), matching the Node responses.
/// </summary>
[ApiController]
[Route("api/v1/webhooks")]
[AllowAnonymous]
public sealed class WebhooksController : ControllerBase
{
    private readonly StripeWebhookService _stripe;
    private readonly KashierWebhookService _kashier;
    private readonly BostaWebhookService _bosta;
    private readonly BostaOptions _bostaOptions;

    public WebhooksController(
        StripeWebhookService stripe,
        KashierWebhookService kashier,
        BostaWebhookService bosta,
        IOptions<AppOptions> options)
    {
        _stripe = stripe;
        _kashier = kashier;
        _bosta = bosta;
        _bostaOptions = options.Value.Bosta;
    }

    // POST /api/v1/webhooks/stripe — verified via raw body + Stripe-Signature header.
    [HttpPost("stripe")]
    public async Task<IActionResult> Stripe(CancellationToken ct)
    {
        if (!_stripe.IsConfigured)
            return StatusCode(503, new { error = "Stripe not configured" });

        // CRITICAL: read the RAW request body. Stripe signature verification requires the
        // exact bytes Stripe signed — do not bind a model or re-serialize.
        string json;
        using (var reader = new StreamReader(Request.Body))
            json = await reader.ReadToEndAsync(ct);

        var signature = Request.Headers["Stripe-Signature"].ToString();

        try
        {
            await _stripe.HandleAsync(json, signature, ct);
        }
        catch (AppException ex)
        {
            // Node logs and returns 400 { error: err.message } on signature/parse failure.
            return StatusCode(400, new { error = ex.Message });
        }

        return Ok(new { received = true });
    }

    // POST /api/v1/webhooks/kashier — verified via x-kashier-signature over the raw body.
    [HttpPost("kashier")]
    public async Task<IActionResult> Kashier(CancellationToken ct)
    {
        if (!_kashier.IsConfigured)
            return StatusCode(503, new { error = "Kashier not configured" });

        string json;
        using (var reader = new StreamReader(Request.Body))
            json = await reader.ReadToEndAsync(ct);

        var signature = Request.Headers["x-kashier-signature"].ToString();

        try
        {
            await _kashier.HandleAsync(json, signature, ct);
        }
        catch (AppException ex)
        {
            return StatusCode(400, new { error = ex.Message });
        }

        return Ok(new { received = true });
    }

    // POST /api/v1/webhooks/bosta — optional auth header, deduped by payload hash.
    [HttpPost("bosta")]
    public async Task<IActionResult> Bosta(CancellationToken ct)
    {
        string rawBody;
        using (var reader = new StreamReader(Request.Body))
            rawBody = await reader.ReadToEndAsync(ct);

        // Read the configured auth header (BostaOptions.WebhookAuthHeaderName) from the request,
        // if any; the service compares it against the configured value.
        string? headerValue = null;
        var headerName = _bostaOptions.WebhookAuthHeaderName;
        if (!string.IsNullOrWhiteSpace(headerName) &&
            Request.Headers.TryGetValue(headerName, out var hv))
        {
            headerValue = hv.ToString();
        }

        try
        {
            var outcome = await _bosta.HandleAsync(rawBody, headerValue, ct);
            return outcome.Status switch
            {
                BostaWebhookStatus.Unauthorized => StatusCode(401, new { error = "Invalid webhook auth header" }),
                BostaWebhookStatus.MissingTrackingNumber => StatusCode(400, new { error = "Missing tracking number" }),
                BostaWebhookStatus.ShipmentNotFound => StatusCode(404, new { error = "Shipment not found" }),
                BostaWebhookStatus.Duplicate => Ok(new { received = true, duplicate = true }),
                _ => Ok(new { received = true }),
            };
        }
        catch (Exception ex)
        {
            // Node returns 500 { error: err.message } on unexpected failure.
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
