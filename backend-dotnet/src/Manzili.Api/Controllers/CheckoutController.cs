using Manzili.Api.Common;
using Manzili.Application.Integrations;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>Port of Node routes/checkout.routes.js. POST /api/v1/checkout (authenticated).</summary>
[Route("api/v1/checkout")]
[Authorize]
public sealed class CheckoutController : ApiController
{
    private readonly CheckoutService _checkout;
    private readonly KashierCheckoutService _kashier;

    public CheckoutController(CheckoutService checkout, KashierCheckoutService kashier)
    {
        _checkout = checkout;
        _kashier = kashier;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CheckoutRequest req)
    {
        var data = await _checkout.CreateCheckoutSessionAsync(RequirePersonId, req, RequestOrigin);
        return ApiOk(data);
    }

    // POST /api/v1/checkout/quote — money breakdown (subtotal, shipping split, fee, commission,
    // total) so the cart shows exactly what will be charged.
    [HttpPost("quote")]
    public async Task<IActionResult> Quote([FromBody] CheckoutRequest req)
    {
        var data = await _checkout.QuoteAsync(req);
        return ApiOk(data);
    }

    // POST /api/v1/checkout/confirm — server-trusted confirmation of a completed Stripe session.
    // Called by the success-redirect so fulfillment runs even without an inbound webhook.
    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmCheckoutRequest req)
    {
        var data = await _checkout.ConfirmSessionAsync(req.SessionId);
        return ApiOk(data);
    }

    // POST /api/v1/checkout/cancel — buyer backed out of the payment page; cancel the still-unpaid
    // order so it doesn't linger as PENDING_PAYMENT. Only affects the caller's own unpaid order.
    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel([FromBody] CancelOrderRequest req)
    {
        var canceled = await _checkout.CancelPendingOrderAsync(RequirePersonId, req?.OrderId ?? 0);
        return ApiOk(new { canceled });
    }

    // POST /api/v1/checkout/kashier — open a Kashier Hosted Payment Page for the cart.
    [HttpPost("kashier")]
    public async Task<IActionResult> Kashier([FromBody] CheckoutRequest req)
    {
        var data = await _kashier.CreatePaymentAsync(RequirePersonId, req, RequestOrigin);
        return ApiOk(data);
    }

    // POST /api/v1/checkout/kashier/confirm — server-trusted confirm of the Kashier redirect return.
    // Body carries the raw return query string so the signature is verified over its original order.
    [HttpPost("kashier/confirm")]
    public async Task<IActionResult> KashierConfirm([FromBody] KashierConfirmRequest req)
    {
        var data = await _kashier.ConfirmAsync(req?.Query);
        return ApiOk(data);
    }
}
