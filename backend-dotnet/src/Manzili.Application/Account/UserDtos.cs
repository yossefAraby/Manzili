using System.Text.Json.Serialization;

namespace Manzili.Application.Account;

// ---- Requests ----

/// <summary>Body for PATCH /api/v1/users/me.</summary>
public sealed class UpdateProfileRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }

    /// <summary>Profile photo URL (already uploaded to Cloudinary); persisted to person.ImageUrl.
    /// Omit (null) to leave unchanged; send "" to clear.</summary>
    public string? Image { get; set; }
}

// ---- Response payloads ----

/// <summary>Shape of the canonical /v1/users/me data: {id,name,email,hasStore,createdAt}.</summary>
public sealed class UserProfileDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";

    /// <summary>Profile photo URL; null when the user hasn't set one (the UI then renders an initial).</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Image { get; set; }

    public bool HasStore { get; set; }
    public string? CreatedAt { get; set; }
}
