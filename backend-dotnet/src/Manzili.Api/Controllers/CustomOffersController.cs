using FluentValidation;
using Manzili.Api.Common;
using Manzili.Application.Custom;
using Manzili.Application.Integrations;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// Port of the /offers/:id/messages endpoints from Node routes/customRequest.routes.js +
/// controllers/customRequest.controller.js.
/// </summary>
[Route("api/v1/custom/offers")]
[Authorize]
public sealed class CustomOffersController : ApiController
{
    private readonly OfferService _offers;
    private readonly CheckoutService _checkout;
    private readonly KashierCheckoutService _kashier;
    private readonly IValidator<SendOfferMessageRequest> _sendValidator;
    private readonly IValidator<OfferActionRequest> _actionValidator;
    private readonly IValidator<OfferPaymentRequest> _paymentValidator;

    public CustomOffersController(
        OfferService offers,
        CheckoutService checkout,
        KashierCheckoutService kashier,
        IValidator<SendOfferMessageRequest> sendValidator,
        IValidator<OfferActionRequest> actionValidator,
        IValidator<OfferPaymentRequest> paymentValidator)
    {
        _offers = offers;
        _checkout = checkout;
        _kashier = kashier;
        _sendValidator = sendValidator;
        _actionValidator = actionValidator;
        _paymentValidator = paymentValidator;
    }

    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetMessages(int id)
    {
        var messages = await _offers.GetOfferMessagesAsync(id);
        return ApiOk(new { messages });
    }

    [HttpPost("{id}/messages")]
    public async Task<IActionResult> SendMessage(int id, [FromBody] SendOfferMessageRequest req)
    {
        await ValidateAsync(_sendValidator, req);
        var data = await _offers.SendOfferMessageAsync(RequirePersonId, id, req);
        return ApiOk(data, statusCode: 201);
    }

    // PATCH /api/v1/custom/offers/{id}  (lifecycle transition: accept|decline|block|progress|ready)
    [HttpPatch("{id}")]
    public async Task<IActionResult> Action(int id, [FromBody] OfferActionRequest req)
    {
        await ValidateAsync(_actionValidator, req);
        var data = await _offers.ApplyActionAsync(RequirePersonId, id, req);
        return ApiOk(data);
    }

    // POST /api/v1/custom/offers/{id}/payments  (record a milestone payment)
    [HttpPost("{id}/payments")]
    public async Task<IActionResult> AddPayment(int id, [FromBody] OfferPaymentRequest req)
    {
        await ValidateAsync(_paymentValidator, req);
        var data = await _offers.AddPaymentAsync(RequirePersonId, id, req);
        return ApiOk(data, statusCode: 201);
    }

    // POST /api/v1/custom/offers/{id}/checkout  (open a Stripe portal for a milestone payment)
    [HttpPost("{id}/checkout")]
    public async Task<IActionResult> Checkout(int id, [FromBody] OfferCheckoutRequest req)
    {
        var data = await _checkout.CreateOfferCheckoutSessionAsync(RequirePersonId, id, req, RequestOrigin);
        return ApiOk(data);
    }

    // POST /api/v1/custom/offers/{id}/kashier  (Kashier HPP for a milestone — Mobile Wallet / Fawry)
    [HttpPost("{id}/kashier")]
    public async Task<IActionResult> Kashier(int id, [FromBody] OfferCheckoutRequest req)
    {
        var data = await _kashier.CreateOfferPaymentAsync(RequirePersonId, id, req, RequestOrigin);
        return ApiOk(data);
    }

    // POST /api/v1/custom/offers/{id}/kashier/confirm  (server-trusted confirm of the Kashier return)
    [HttpPost("{id}/kashier/confirm")]
    public async Task<IActionResult> KashierConfirm(int id, [FromBody] OfferKashierConfirmRequest req)
    {
        var data = await _kashier.ConfirmOfferAsync(id, req);
        return ApiOk(data);
    }
}
