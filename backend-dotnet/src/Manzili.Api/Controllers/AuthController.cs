using FluentValidation;
using Manzili.Api.Common;
using Manzili.Application.Auth;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/auth")]
public sealed class AuthController : ApiController
{
    private readonly AuthService _auth;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;

    public AuthController(
        AuthService auth,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator)
    {
        _auth = auth;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        await ValidateAsync(_registerValidator, req);
        var result = await _auth.RegisterAsync(req);
        AuthCookies.Set(HttpContext, result.Tokens);
        return ApiOk(result.Data, statusCode: 201);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        await ValidateAsync(_loginValidator, req);
        var result = await _auth.LoginAsync(req);
        AuthCookies.Set(HttpContext, result.Tokens);
        return ApiOk(result.Data);
    }

    /// <summary>
    /// Google Sign-In. Verifies the GIS ID token server-side and issues the SAME httpOnly cookie
    /// session as email/password login, so the SPA flow is identical afterwards.
    /// </summary>
    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleLoginRequest req)
    {
        var result = await _auth.GoogleLoginAsync(req);
        AuthCookies.Set(HttpContext, result.Tokens);
        return ApiOk(result.Data);
    }

    /// <summary>Rotates the access+refresh cookies using the refresh-token cookie. No body.</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var rt = Request.Cookies[AuthCookies.RefreshCookie];
        if (string.IsNullOrEmpty(rt))
            throw new UnauthorizedException("No refresh token");

        var result = await _auth.RefreshAsync(new RefreshRequest { RefreshToken = rt });
        AuthCookies.Set(HttpContext, result.Tokens);
        return ApiOk(null);
    }

    /// <summary>The current user's session (id, name, email, role, storeId) from the cookie. Used to rehydrate the SPA on load.</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _auth.GetSessionAsync(RequirePersonId);
        return ApiOk(new LoginData { User = user });
    }

    /// <summary>Clears the auth cookies and revokes the stored refresh token.</summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (CurrentPersonId is int personId)
        {
            try { await _auth.LogoutAsync(personId); } catch { /* best-effort revoke */ }
        }
        AuthCookies.Clear(HttpContext);
        return ApiMessage("Logged out");
    }
}
