using Manzili.Api.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/seller")]
[Authorize(Roles = "seller")]
public sealed class SellerCouponController : ApiController
{
    private readonly CouponService _coupons;

    public SellerCouponController(CouponService coupons) => _coupons = coupons;

    [HttpGet("coupons")]
    public async Task<IActionResult> ListCoupons()
    {
        var result = await _coupons.ListCouponsAsync(RequireSellerId);
        return ApiOk(result);
    }

    [HttpPost("coupons")]
    public async Task<IActionResult> CreateCoupon([FromBody] CreateCouponRequest body)
    {
        var data = await _coupons.CreateCouponAsync(RequirePersonId, RequireSellerId, body);
        return ApiOk(data, statusCode: 201);
    }

    [HttpDelete("coupons/{id}")]
    public async Task<IActionResult> DeleteCoupon(int id)
    {
        var message = await _coupons.DeleteCouponAsync(RequireSellerId, id);
        return ApiOk(null, new Dictionary<string, object?> { ["message"] = message });
    }

    [HttpPost("coupon")]
    public async Task<IActionResult> ValidateCoupon([FromBody] ValidateCouponRequest body)
    {
        var data = await _coupons.ValidateCouponAsync(body);
        return ApiOk(data);
    }
}
