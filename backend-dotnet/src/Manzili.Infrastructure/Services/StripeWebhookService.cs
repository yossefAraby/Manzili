using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of Node routes/webhook.routes.js POST /stripe. Verifies the signature against the
/// RAW request body and, on checkout.session.completed, marks the order + store_orders paid.
/// </summary>
public sealed class StripeWebhookService
{
    private readonly StripeOptions _stripe;
    private readonly CheckoutService _checkout;

    public StripeWebhookService(IOptions<AppOptions> options, CheckoutService checkout)
    {
        _stripe = options.Value.Stripe;
        _checkout = checkout;
    }

    /// <summary>True when both the secret key and webhook secret are present.</summary>
    public bool IsConfigured =>
        _stripe.IsConfigured && !string.IsNullOrWhiteSpace(_stripe.WebhookSecret);

    /// <summary>
    /// Handles a raw Stripe webhook. <paramref name="json"/> MUST be the exact raw body
    /// (no re-serialization) for signature verification to succeed.
    /// Throws AppException(400) on signature/parse failure (mirrors Node 400 response).
    /// </summary>
    public async Task HandleAsync(string json, string? signatureHeader, CancellationToken ct = default)
    {
        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, _stripe.WebhookSecret);
        }
        catch (Exception ex)
        {
            throw new AppException(ex.Message, 400, "BAD_REQUEST");
        }

        if (stripeEvent.Type == "checkout.session.completed")
        {
            if (stripeEvent.Data.Object is not Session session) return;

            // Apply via the shared, idempotent dispatch (orders → fulfillment, offers → milestone).
            await _checkout.ApplyPaidSessionAsync(session, ct);
        }
    }
}
