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
    // Normal (buyer/seller) session cookies, scoped to the whole site (Path "/").
    public const string AccessCookie = "manzili_at";
    public const string RefreshCookie = "manzili_rt";

    // The admin portal gets its OWN cookie pair, PATH-SCOPED to /api/v1/admin so the browser
    // never sends them to /auth/me or /seller/*. This makes the admin session physically
    // separate from a buyer/seller session: logging into one cannot clobber the other, and a
    // browser can hold both at once. The JWT extractor (Program.cs) reads the admin cookie on
    // /api/v1/admin/* routes and the normal cookie everywhere else.
    public const string AdminAccessCookie = "manzili_admin_at";
    public const string AdminRefreshCookie = "manzili_admin_rt";
    public const string AdminPath = "/api/v1/admin";

    private static CookieOptions BuildOptions(HttpContext ctx, bool forDelete, string path)
    {
        var secure = ctx.Request.IsHttps;
        var opts = new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = secure ? SameSiteMode.None : SameSiteMode.Lax,
            Path = path,
            IsEssential = true,
        };
        // Cookie lifetime = refresh-token lifetime; the access JWT's own `exp` (15m)
        // still forces a refresh, but the cookie survives reloads in between.
        if (!forDelete) opts.MaxAge = TimeSpan.FromDays(7);
        return opts;
    }

    public static void Set(HttpContext ctx, AuthTokens tokens, bool admin = false)
    {
        var opts = BuildOptions(ctx, forDelete: false, path: admin ? AdminPath : "/");
        ctx.Response.Cookies.Append(admin ? AdminAccessCookie : AccessCookie, tokens.Token, opts);
        ctx.Response.Cookies.Append(admin ? AdminRefreshCookie : RefreshCookie, tokens.RefreshToken, opts);
    }

    public static void Clear(HttpContext ctx, bool admin = false)
    {
        // Delete must use the SAME Path the cookie was set with, or the browser keeps it.
        var opts = BuildOptions(ctx, forDelete: true, path: admin ? AdminPath : "/");
        ctx.Response.Cookies.Delete(admin ? AdminAccessCookie : AccessCookie, opts);
        ctx.Response.Cookies.Delete(admin ? AdminRefreshCookie : RefreshCookie, opts);
    }
}
