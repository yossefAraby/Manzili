using FluentValidation;
using Manzili.Api.Common;
using Manzili.Application.Custom;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// Port of Node routes/customRequest.routes.js (the /requests endpoints) +
/// controllers/customRequest.controller.js. Buyer-facing custom requests and their offers.
/// </summary>
[Route("api/v1/custom/requests")]
[Authorize]
public sealed class CustomRequestsController : ApiController
{
    private readonly CustomRequestService _requests;
    private readonly OfferService _offers;
    private readonly IValidator<CreateCustomRequestRequest> _createValidator;
    private readonly IValidator<SubmitOfferRequest> _submitOfferValidator;

    public CustomRequestsController(
        CustomRequestService requests,
        OfferService offers,
        IValidator<CreateCustomRequestRequest> createValidator,
        IValidator<SubmitOfferRequest> submitOfferValidator)
    {
        _requests = requests;
        _offers = offers;
        _createValidator = createValidator;
        _submitOfferValidator = submitOfferValidator;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? page, [FromQuery] int? limit)
    {
        var result = await _requests.ListBuyerRequestsAsync(RequirePersonId, page, limit);
        return ApiOk(
            new { requests = result.Requests },
            new Dictionary<string, object?>
            {
                ["total"] = result.Total,
                ["page"] = result.Page,
                ["limit"] = result.Limit,
            });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomRequestRequest req)
    {
        await ValidateAsync(_createValidator, req);
        var data = await _requests.CreateRequestAsync(RequirePersonId, req);
        return ApiOk(data, statusCode: 201);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await _requests.GetRequestByIdAsync(RequirePersonId, id);
        return ApiOk(data);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCustomRequestRequest req)
    {
        var data = await _requests.UpdateRequestAsync(RequirePersonId, id, req);
        return ApiOk(data);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var message = await _requests.DeleteRequestAsync(RequirePersonId, id);
        return ApiMessage(message);
    }

    [HttpGet("{id}/offers")]
    public async Task<IActionResult> ListOffers(int id)
    {
        var result = await _offers.ListOffersAsync(id);
        return ApiOk(
            new { offers = result.Offers },
            new Dictionary<string, object?> { ["total"] = result.Total });
    }

    [HttpGet("{id}/active-offer")]
    public async Task<IActionResult> GetActiveOffer(int id)
    {
        var data = await _offers.GetActiveOfferAsync(id);
        return ApiOk(data);
    }

    // POST /api/v1/custom/requests/{id}/offers  (seller submits an offer)
    [HttpPost("{id}/offers")]
    [Authorize(Roles = "seller")]
    public async Task<IActionResult> SubmitOffer(int id, [FromBody] SubmitOfferRequest req)
    {
        await ValidateAsync(_submitOfferValidator, req);
        var data = await _offers.SubmitOfferAsync(RequireSellerId, id, req);
        return ApiOk(data, statusCode: 201);
    }
}
