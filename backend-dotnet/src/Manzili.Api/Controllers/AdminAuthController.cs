using Manzili.Api.Common;
using Manzili.Application.Auth;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// The admin portal's own auth, fully separate from the buyer/seller <c>/auth/*</c>. It issues a
/// SEPARATE cookie pair (path-scoped to /api/v1/admin) so an admin session can never clobber, or be
/// clobbered by, a normal buyer/seller session in the same browser. Login only succeeds for accounts
/// that have a <c>systemadmin</c> row.
/// </summary>
[Route("api/v1/admin/auth")]
public sealed class AdminAuthController : ApiController
{
    private readonly AuthService _auth;

    public AdminAuthController(AuthService auth) => _auth = auth;

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest req)
    {
        var result = await _auth.LoginAdminAsync(req);
        AuthCookies.Set(HttpContext, result.Tokens, admin: true);
        return ApiOk(result.Data);
    }

    /// <summary>Rotates the admin access+refresh cookies using the admin refresh-token cookie.</summary>
    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var rt = Request.Cookies[AuthCookies.AdminRefreshCookie];
        if (string.IsNullOrEmpty(rt))
            throw new UnauthorizedException("No refresh token");

        var result = await _auth.RefreshAsync(new RefreshRequest { RefreshToken = rt });
        AuthCookies.Set(HttpContext, result.Tokens, admin: true);
        return ApiOk(null);
    }

    /// <summary>The current admin's session (id, name, email, role) from the admin cookie. Rehydrates the admin SPA.</summary>
    [Authorize(Roles = "admin")]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _auth.GetSessionAsync(RequirePersonId);
        return ApiOk(new LoginData { User = user });
    }

    /// <summary>Clears the admin cookies and revokes the stored refresh token (best-effort).</summary>
    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var rt = Request.Cookies[AuthCookies.AdminRefreshCookie];
        if (!string.IsNullOrEmpty(rt))
        {
            try { await _auth.LogoutByRefreshTokenAsync(rt); } catch { /* best-effort revoke */ }
        }
        AuthCookies.Clear(HttpContext, admin: true);
        return ApiMessage("Logged out");
    }
}
