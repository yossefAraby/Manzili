using Manzili.Api.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// Buyer-facing coupon validation. The seller coupon routes are seller-role-locked, but a buyer
/// applying a code at checkout still needs to validate it — this exposes that one read to any
/// signed-in user (so OrderSummary's "apply coupon" works instead of 403-ing).
/// </summary>
[Route("api/v1/coupons")]
[Authorize]
public sealed class CouponController : ApiController
{
    private readonly CouponService _coupons;

    public CouponController(CouponService coupons) => _coupons = coupons;

    // POST /coupons/validate  { code } — validate a coupon code at checkout (any signed-in user).
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateCouponRequest body)
    {
        var data = await _coupons.ValidateCouponAsync(body);
        return ApiOk(data);
    }
}
