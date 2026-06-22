using FluentValidation;
using Manzili.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Common;

/// <summary>
/// Base controller producing the Node-compatible response envelope:
/// success → { success:true, data, ...meta }  (meta merged at top level)
/// </summary>
[ApiController]
public abstract class ApiController : ControllerBase
{
    protected IActionResult ApiOk(object? data, IDictionary<string, object?>? meta = null, int statusCode = 200)
    {
        var payload = new Dictionary<string, object?>
        {
            ["success"] = true,
            ["data"] = data,
        };
        if (meta is not null)
            foreach (var (key, value) in meta)
                payload[key] = value;

        return StatusCode(statusCode, payload);
    }

    protected IActionResult ApiMessage(string message, int statusCode = 200) =>
        StatusCode(statusCode, new Dictionary<string, object?> { ["success"] = true, ["message"] = message });

    // ---- Current user (from JWT claims) ----
    protected int? CurrentPersonId =>
        int.TryParse(User.FindFirst("sub")?.Value, out var id) ? id : null;

    protected int RequirePersonId =>
        CurrentPersonId ?? throw new UnauthorizedException();

    protected string? CurrentRole => User.FindFirst("role")?.Value;

    protected int? CurrentSellerId =>
        int.TryParse(User.FindFirst("sellerId")?.Value, out var id) ? id : null;

    protected int RequireSellerId =>
        CurrentSellerId ?? throw new ForbiddenException("Seller account required");

    /// <summary>
    /// The origin the request came from (e.g. http://localhost:3000 or https://manzili-mis.vercel.app),
    /// so payment redirect URLs return to the site the checkout was triggered from. Prefers the
    /// <c>Origin</c> header, falls back to the scheme+host of <c>Referer</c>; null when neither is
    /// present. The checkout services validate it against the CORS allowlist before trusting it.
    /// </summary>
    protected string? RequestOrigin
    {
        get
        {
            var origin = Request.Headers.Origin.ToString();
            if (!string.IsNullOrWhiteSpace(origin)) return origin;
            var referer = Request.Headers.Referer.ToString();
            if (!string.IsNullOrWhiteSpace(referer) && Uri.TryCreate(referer, UriKind.Absolute, out var u))
                return $"{u.Scheme}://{u.Authority}";
            return null;
        }
    }

    /// <summary>Runs a FluentValidation validator and throws a 400 ValidationAppException on failure.</summary>
    protected static async Task ValidateAsync<T>(IValidator<T> validator, T instance)
    {
        var result = await validator.ValidateAsync(instance);
        if (result.IsValid) return;
        var details = result.Errors
            .Select(e => new { path = e.PropertyName, message = e.ErrorMessage })
            .ToArray();
        throw new ValidationAppException(details);
    }
}
