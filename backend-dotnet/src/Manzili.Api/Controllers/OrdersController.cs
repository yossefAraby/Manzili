using FluentValidation;
using Manzili.Api.Common;
using Manzili.Application.Common;
using Manzili.Application.Orders;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>Port of Node routes/order.routes.js + controllers/order.controller.js (buyer side).</summary>
[Route("api/v1/orders")]
[Authorize]
public sealed class OrdersController : ApiController
{
    private readonly OrderService _orders;
    private readonly FulfillmentService _fulfillment;
    private readonly IValidator<CreateOrderRequest> _createValidator;

    public OrdersController(OrderService orders, FulfillmentService fulfillment, IValidator<CreateOrderRequest> createValidator)
    {
        _orders = orders;
        _fulfillment = fulfillment;
        _createValidator = createValidator;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest req)
    {
        await ValidateAsync(_createValidator, req);
        var data = await _orders.CreateOrderAsync(RequirePersonId, req);
        return ApiOk(data, statusCode: 201);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var result = await _orders.ListOrdersAsync(RequirePersonId);
        return ApiOk(
            new { orders = result.Orders },
            new Dictionary<string, object?> { ["total"] = result.Total });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var data = await _orders.GetOrderByIdAsync(RequirePersonId, id);
        return ApiOk(data);
    }

    // POST /api/v1/orders/{storeOrderId}/simulate-advance — demo control. Advances the buyer's own
    // store order one step (PROCESSING → SHIPPED → DELIVERED) through the same FulfillmentService
    // path the Bosta webhook uses, so wallet release + notifications fire. This is the mechanism
    // that lets a COD order (which is never "paid" online) be walked all the way to Delivered for
    // the demo — settlement happens on delivery. Ownership is enforced in the service, so a buyer
    // can only advance their own order.
    [HttpPost("{storeOrderId:int}/simulate-advance")]
    public async Task<IActionResult> SimulateAdvance(int storeOrderId)
    {
        var status = await _fulfillment.SimulateAdvanceStoreOrderAsync(RequirePersonId, storeOrderId);
        return ApiOk(new { id = storeOrderId.ToString(), status });
    }

    // POST /api/v1/orders/{id}/return — buyer requests a return. The request is recorded as
    // PENDING_APPROVAL; the Bosta reverse pickup + refund + wallet reversal only run once an admin
    // approves it (see /api/v1/admin/returns/{id}/approve).
    [HttpPost("{id}/return")]
    public async Task<IActionResult> RequestReturn(int id, [FromBody] ReturnOrderRequest? body)
    {
        var (returnId, refund, tracking) = await _fulfillment.RequestReturnForOrderAsync(RequirePersonId, id, body?.Reason);
        return ApiOk(new
        {
            id = returnId.ToString(),
            refundAmount = refund,
            trackingNumber = tracking,
            status = "PENDING_APPROVAL",
        }, statusCode: 201);
    }
}
