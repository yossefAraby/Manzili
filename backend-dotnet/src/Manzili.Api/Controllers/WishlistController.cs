using Manzili.Api.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Authorize]
[Route("api/v1/wishlist")]
public sealed class WishlistController : ApiController
{
    private readonly WishlistService _wishlist;

    public WishlistController(WishlistService wishlist) => _wishlist = wishlist;

    [HttpGet]
    public async Task<IActionResult> GetWishlist()
    {
        var result = await _wishlist.GetWishlistAsync(RequirePersonId);
        return ApiOk(
            new { wishlistCards = result.WishlistCards },
            new Dictionary<string, object?> { ["total"] = result.Total });
    }

    [HttpPost("{productId}")]
    public async Task<IActionResult> AddToWishlist(int productId)
    {
        var message = await _wishlist.AddToWishlistAsync(RequirePersonId, productId);
        return ApiMessage(message);
    }

    [HttpDelete("{productId}")]
    public async Task<IActionResult> RemoveFromWishlist(int productId)
    {
        var message = await _wishlist.RemoveFromWishlistAsync(RequirePersonId, productId);
        return ApiMessage(message);
    }

    [HttpDelete]
    public async Task<IActionResult> ClearWishlist()
    {
        var message = await _wishlist.ClearWishlistAsync(RequirePersonId);
        return ApiMessage(message);
    }
}
