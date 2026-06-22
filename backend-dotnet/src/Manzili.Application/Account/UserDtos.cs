using System.Text.Json.Serialization;

namespace Manzili.Application.Account;

// ---- Requests ----

/// <summary>Body for PATCH /api/v1/users/me.</summary>
public sealed class UpdateProfileRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
}

// ---- Response payloads ----

/// <summary>Shape of the canonical /v1/users/me data: {id,name,email,hasStore,createdAt}.</summary>
public sealed class UserProfileDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public bool HasStore { get; set; }
    public string? CreatedAt { get; set; }
}
