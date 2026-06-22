using System.Text.Json.Serialization;

namespace Manzili.Application.Auth;

// ---- Requests ----
public sealed class RegisterRequest
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public sealed class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public sealed class RefreshRequest
{
    public string RefreshToken { get; set; } = "";
}

/// <summary>Body for the separate admin login (POST /api/v1/admin/auth/login).</summary>
public sealed class AdminLoginRequest
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

/// <summary>Body for POST /api/v1/auth/google. <c>Credential</c> is the GIS ID token (a JWT).</summary>
public sealed class GoogleLoginRequest
{
    public string Credential { get; set; } = "";
}

/// <summary>
/// Verified Google identity passed from the controller (which owns the token verification) to
/// the service. Decouples AuthService from the Google.Apis.Auth payload type.
/// </summary>
public sealed class GoogleIdentity
{
    public string Email { get; set; } = "";
    public string? Name { get; set; }
    public string? Picture { get; set; }
}

// ---- Response payloads (the "data" portion of the envelope) ----
public sealed class RegisterData
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
}

public sealed class LoginData
{
    public LoginUser User { get; set; } = new();
}

public sealed class LoginUser
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "buyer";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? StoreId { get; set; }

    /// <summary>Profile photo URL (Cloudinary); null when the user hasn't set one.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Image { get; set; }
}

// ---- Service results (data + the top-level token/refreshToken meta) ----
public sealed class AuthTokens
{
    public string Token { get; set; } = "";
    public string RefreshToken { get; set; } = "";
}

public sealed record RegisterResult(RegisterData Data, AuthTokens Tokens);
public sealed record LoginResult(LoginData Data, AuthTokens Tokens);
public sealed record RefreshResult(AuthTokens Tokens);
