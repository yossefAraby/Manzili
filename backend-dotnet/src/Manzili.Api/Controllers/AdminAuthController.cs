using Manzili.Api.Common;
using Manzili.Application.Auth;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// The admin portal's own login, separate from the buyer/seller <c>/auth/login</c>. It only
/// succeeds for accounts that have a <c>systemadmin</c> row, and issues an admin-role JWT.
/// </summary>
[Route("api/v1/admin/auth")]
[AllowAnonymous]
public sealed class AdminAuthController : ApiController
{
    private readonly AuthService _auth;

    public AdminAuthController(AuthService auth) => _auth = auth;

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest req)
    {
        var result = await _auth.LoginAdminAsync(req);
        AuthCookies.Set(HttpContext, result.Tokens);
        return ApiOk(result.Data);
    }
}
