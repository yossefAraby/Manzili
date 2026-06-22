using Manzili.Api.Common;
using Manzili.Application.Account;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Authorize]
[Route("api/v1/users")]
public sealed class UsersController : ApiController
{
    private readonly UserService _users;
    private readonly AddressService _addresses;

    public UsersController(UserService users, AddressService addresses)
    {
        _users = users;
        _addresses = addresses;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var data = await _users.GetProfileAsync(RequirePersonId);
        return ApiOk(data);
    }

    [HttpPatch("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var data = await _users.UpdateProfileAsync(RequirePersonId, req);
        return ApiOk(data);
    }

    [HttpGet("me/addresses")]
    public async Task<IActionResult> ListAddresses()
    {
        var addresses = await _addresses.ListAddressesAsync(RequirePersonId);
        return ApiOk(new { addresses });
    }

    [HttpPost("me/addresses")]
    public async Task<IActionResult> CreateAddress([FromBody] CreateAddressRequest req)
    {
        var data = await _addresses.CreateAddressAsync(RequirePersonId, req);
        return ApiOk(data, statusCode: 201);
    }

    [HttpDelete("me/addresses/{id}")]
    public async Task<IActionResult> DeleteAddress(int id)
    {
        await _addresses.DeleteAddressAsync(RequirePersonId, id);
        return ApiMessage("Address removed");
    }
}
