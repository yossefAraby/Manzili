using Manzili.Api.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/seller/wallet")]
[Authorize(Roles = "seller")]
public sealed class SellerWalletController : ApiController
{
    private readonly WalletService _wallet;

    public SellerWalletController(WalletService wallet) => _wallet = wallet;

    [HttpGet]
    public async Task<IActionResult> GetWallet()
    {
        var data = await _wallet.GetWalletAsync(RequireSellerId);
        return ApiOk(data);
    }

    [HttpPost("payout")]
    public async Task<IActionResult> RequestPayout([FromBody] RequestPayoutRequest body)
    {
        var data = await _wallet.RequestPayoutAsync(RequireSellerId, body);
        return ApiOk(data);
    }

    [HttpPost("bank-details")]
    public async Task<IActionResult> UpdateBankDetails([FromBody] UpdateBankDetailsRequest body)
    {
        var message = await _wallet.UpdateBankDetailsAsync(RequireSellerId, body);
        return ApiOk(new { message });
    }
}
