using Manzili.Api.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/seller")]
[Authorize(Roles = "seller")]
public sealed class SellerReturnController : ApiController
{
    private readonly ReturnService _returns;

    public SellerReturnController(ReturnService returns) => _returns = returns;

    [HttpGet("returns")]
    public async Task<IActionResult> ListReturns()
    {
        var data = await _returns.ListReturnsAsync(RequireSellerId);
        return ApiOk(data);
    }

    [HttpPost("orders/{id}/return")]
    public async Task<IActionResult> ProcessReturn(int id, [FromBody] ProcessReturnRequest body)
    {
        var data = await _returns.ProcessReturnAsync(RequireSellerId, id, body);
        return ApiOk(data);
    }
}
