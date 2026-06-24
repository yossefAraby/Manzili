using Manzili.Api.Common;
using Manzili.Application.Cart;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// The account-linked cart. A logged-in buyer's cart is persisted server-side (scoped to their
/// person) so it survives logout and follows them across devices — it is never browser-local.
/// </summary>
[Authorize]
[Route("api/v1/cart")]
public sealed class CartController : ApiController
{
    private readonly CartService _cart;

    public CartController(CartService cart) => _cart = cart;

    /// <summary>The buyer's saved cart lines.</summary>
    [HttpGet]
    public async Task<IActionResult> Get()
        => ApiOk(new { items = await _cart.GetCartAsync(RequirePersonId) });

    /// <summary>Replace the saved cart with the posted lines (full-cart sync from the SPA).</summary>
    [HttpPut]
    public async Task<IActionResult> Save([FromBody] SaveCartRequest? req)
        => ApiOk(new { items = await _cart.SaveCartAsync(RequirePersonId, req?.Items) });

    /// <summary>Merge guest lines into the saved cart (summing quantities) — used on login.</summary>
    [HttpPost("merge")]
    public async Task<IActionResult> Merge([FromBody] SaveCartRequest? req)
        => ApiOk(new { items = await _cart.MergeCartAsync(RequirePersonId, req?.Items) });

    /// <summary>Empty the saved cart (e.g. after checkout).</summary>
    [HttpDelete]
    public async Task<IActionResult> Clear()
    {
        await _cart.ClearCartAsync(RequirePersonId);
        return ApiMessage("Cart cleared");
    }
}
