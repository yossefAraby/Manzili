using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Manzili.Application.Auth;
using Manzili.Application.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Manzili.Infrastructure.Security;

/// <summary>
/// Signs/validates JWTs, mirroring Node utils/jwt.js. Same HS256 secrets and the same
/// payload claims (sub, email, role, sellerId) so tokens are interchangeable.
/// </summary>
public sealed partial class TokenService
{
    private readonly JwtOptions _jwt;

    public TokenService(IOptions<AppOptions> options) => _jwt = options.Value.Jwt;

    public AuthTokens Issue(int personId, string email, string role, int? sellerId)
    {
        var claims = new List<Claim>
        {
            new("sub", personId.ToString()),
            new("email", email),
            new("role", role),
        };
        if (sellerId.HasValue) claims.Add(new Claim("sellerId", sellerId.Value.ToString()));

        return new AuthTokens
        {
            Token = Sign(claims, _jwt.Secret, ParseDuration(_jwt.ExpiresIn)),
            RefreshToken = Sign(claims, _jwt.RefreshSecret, ParseDuration(_jwt.RefreshExpiresIn)),
        };
    }

    /// <summary>Validates a refresh token and returns its claims principal, or null if invalid.</summary>
    public ClaimsPrincipal? ValidateRefreshToken(string token)
    {
        try
        {
            // MapInboundClaims=false keeps "sub"/"role"/"sellerId" as-is (no URI remapping).
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            return handler.ValidateToken(token, RefreshValidationParameters(), out _);
        }
        catch
        {
            return null;
        }
    }

    public TokenValidationParameters AccessValidationParameters() =>
        BuildValidationParameters(_jwt.Secret);

    private TokenValidationParameters RefreshValidationParameters() =>
        BuildValidationParameters(_jwt.RefreshSecret);

    private static TokenValidationParameters BuildValidationParameters(string secret) => new()
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(5),
        NameClaimType = "sub",
        RoleClaimType = "role",
    };

    private static string Sign(IEnumerable<Claim> claims, string secret, TimeSpan lifetime)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.Add(lifetime),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Parses durations like "15m", "7d", "30s", "12h" (jsonwebtoken-style).</summary>
    public static TimeSpan ParseDuration(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return TimeSpan.FromMinutes(15);
        var m = DurationRegex().Match(value.Trim());
        if (!m.Success) return TimeSpan.FromMinutes(15);
        var n = double.Parse(m.Groups[1].Value);
        return m.Groups[2].Value switch
        {
            "s" => TimeSpan.FromSeconds(n),
            "m" => TimeSpan.FromMinutes(n),
            "h" => TimeSpan.FromHours(n),
            "d" => TimeSpan.FromDays(n),
            _ => TimeSpan.FromMinutes(15),
        };
    }

    [GeneratedRegex(@"^(\d+)\s*([smhd])$")]
    private static partial Regex DurationRegex();
}
