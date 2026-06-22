using Manzili.Application.Auth;

namespace Manzili.Api.Common;

/// <summary>
/// Issues the auth JWTs as <b>httpOnly</b> cookies so the browser never exposes the
/// tokens to JavaScript (XSS-safe). The SPA sends them automatically with
/// <c>credentials: 'include'</c>; nothing is stored in localStorage/sessionStorage.
///
/// Dev (http://localhost): SameSite=Lax + non-Secure — frontend (:3000) and API
/// (:5080) are the same site (localhost), so Lax cookies are sent on the XHR.
/// Prod (https, cross-domain): SameSite=None + Secure so the cookie crosses sites.
/// </summary>
public static class AuthCookies
{
    public const string AccessCookie = "manzili_at";
    public const string RefreshCookie = "manzili_rt";

    private static CookieOptions BuildOptions(HttpContext ctx, bool forDelete)
    {
        var secure = ctx.Request.IsHttps;
        var opts = new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = secure ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/",
            IsEssential = true,
        };
        // Cookie lifetime = refresh-token lifetime; the access JWT's own `exp` (15m)
        // still forces a refresh, but the cookie survives reloads in between.
        if (!forDelete) opts.MaxAge = TimeSpan.FromDays(7);
        return opts;
    }

    public static void Set(HttpContext ctx, AuthTokens tokens)
    {
        var opts = BuildOptions(ctx, forDelete: false);
        ctx.Response.Cookies.Append(AccessCookie, tokens.Token, opts);
        ctx.Response.Cookies.Append(RefreshCookie, tokens.RefreshToken, opts);
    }

    public static void Clear(HttpContext ctx)
    {
        var opts = BuildOptions(ctx, forDelete: true);
        ctx.Response.Cookies.Delete(AccessCookie, opts);
        ctx.Response.Cookies.Delete(RefreshCookie, opts);
    }
}
