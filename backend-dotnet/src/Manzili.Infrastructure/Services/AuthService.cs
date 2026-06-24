using Google.Apis.Auth;
using Manzili.Application.Auth;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Manzili.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/auth.service.js.</summary>
public sealed class AuthService
{
    private readonly ManziliDbContext _db;
    private readonly PasswordHasher _passwords;
    private readonly TokenService _tokens;
    private readonly GoogleAuthOptions _google;

    public AuthService(ManziliDbContext db, PasswordHasher passwords, TokenService tokens, IOptions<AppOptions> options)
    {
        _db = db;
        _passwords = passwords;
        _tokens = tokens;
        _google = options.Value.Google;
    }

    private async Task<(string Role, int? SellerId)> DetermineRoleAsync(int personId)
    {
        var admin = await _db.Systemadmins.AsNoTracking().FirstOrDefaultAsync(a => a.Personid == personId);
        if (admin is not null) return ("admin", null);

        // Seller access is gated on store verification: a person only gets the "seller" role
        // (and dashboard access) once an admin has APPROVED their store and it's active. A
        // pending/rejected/disabled applicant logs in as a normal buyer and sees their
        // application status via GET /stores/my-application.
        var seller = await _db.Sellers.AsNoTracking().FirstOrDefaultAsync(s => s.Personid == personId);
        if (seller is not null
            && string.Equals(seller.StoreStatus, StatusMaps.StoreStatus.Approved, StringComparison.OrdinalIgnoreCase)
            && seller.IsActive == true)
            return ("seller", seller.Sellerid);

        return ("buyer", null);
    }

    private static string FullName(Person p) =>
        string.Join(" ", new[] { p.FirstName, p.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));

    public async Task<RegisterResult> RegisterAsync(RegisterRequest req)
    {
        var exists = await _db.People.AsNoTracking().AnyAsync(p => p.Email == req.Email);
        if (exists) throw new ConflictException("Email already registered");

        var parts = req.Name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var firstName = parts.Length > 0 ? parts[0] : req.Name.Trim();
        var lastName = parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : null;

        var person = new Person
        {
            Email = req.Email,
            Password = _passwords.Hash(req.Password),
            FirstName = firstName,
            LastName = lastName,
        };

        await using var tx = await _db.Database.BeginTransactionAsync();
        _db.People.Add(person);
        await _db.SaveChangesAsync();
        _db.Endusers.Add(new Enduser { Personid = person.Personid });
        await _db.SaveChangesAsync();

        var tokens = _tokens.Issue(person.Personid, person.Email, "buyer", null);
        person.RefreshToken = tokens.RefreshToken;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return new RegisterResult(
            new RegisterData { Id = person.Personid.ToString(), Name = FullName(person), Email = person.Email },
            tokens);
    }

    public async Task<LoginResult> LoginAsync(LoginRequest req)
    {
        var person = await _db.People.FirstOrDefaultAsync(p => p.Email == req.Email)
            ?? throw new UnauthorizedException("Invalid email or password");

        if (!_passwords.Verify(req.Password, person.Password))
            throw new UnauthorizedException("Invalid email or password");

        var (role, sellerId) = await DetermineRoleAsync(person.Personid);
        var tokens = _tokens.Issue(person.Personid, person.Email, role, sellerId);

        person.RefreshToken = tokens.RefreshToken;
        await _db.SaveChangesAsync();

        return new LoginResult(
            new LoginData
            {
                User = new LoginUser
                {
                    Id = person.Personid.ToString(),
                    Name = FullName(person),
                    Email = person.Email,
                    Role = role,
                    StoreId = sellerId?.ToString(),
                    Image = person.ImageUrl,
                },
            },
            tokens);
    }

    /// <summary>
    /// Google Sign-In. Verifies the GIS ID token (signature + audience == our Client ID), then
    /// finds-or-creates the matching Person and issues the SAME token pair as email/password login,
    /// so the resulting cookie session is byte-for-byte identical. An OAuth-only account gets a
    /// random unusable password (it can still set one later / reset).
    /// </summary>
    public async Task<LoginResult> GoogleLoginAsync(GoogleLoginRequest req)
    {
        if (!_google.IsConfigured)
            throw new AppException("Google login not configured", 503, "SERVICE_UNAVAILABLE");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(
                req.Credential,
                new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { _google.ClientId! } });
        }
        catch
        {
            throw new UnauthorizedException("Invalid Google credential");
        }

        if (payload.EmailVerified != true || string.IsNullOrWhiteSpace(payload.Email))
            throw new UnauthorizedException("Google email not verified");

        var email = payload.Email.Trim();
        var person = await _db.People.FirstOrDefaultAsync(p => p.Email == email);
        if (person is null)
        {
            // Create like RegisterAsync: Person + Enduser, no usable password (OAuth-only account).
            var parts = (payload.Name ?? email).Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            person = new Person
            {
                Email = email,
                Password = _passwords.Hash(Guid.NewGuid().ToString("N")),
                FirstName = parts.Length > 0 ? parts[0] : email,
                LastName = parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : null,
                ImageUrl = payload.Picture,
            };

            await using var tx = await _db.Database.BeginTransactionAsync();
            _db.People.Add(person);
            await _db.SaveChangesAsync();
            _db.Endusers.Add(new Enduser { Personid = person.Personid });
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        else if (string.IsNullOrWhiteSpace(person.ImageUrl) && !string.IsNullOrWhiteSpace(payload.Picture))
        {
            // Backfill a profile photo for an existing account that has none.
            person.ImageUrl = payload.Picture;
        }

        var (role, sellerId) = await DetermineRoleAsync(person.Personid);
        var tokens = _tokens.Issue(person.Personid, person.Email, role, sellerId);

        person.RefreshToken = tokens.RefreshToken;
        await _db.SaveChangesAsync();

        return new LoginResult(
            new LoginData
            {
                User = new LoginUser
                {
                    Id = person.Personid.ToString(),
                    Name = FullName(person),
                    Email = person.Email,
                    Role = role,
                    StoreId = sellerId?.ToString(),
                    Image = person.ImageUrl,
                },
            },
            tokens);
    }

    /// <summary>
    /// Separate admin login. Authenticates by username (stored in Person.Email) + password and
    /// requires a matching <c>systemadmin</c> row — buyer/seller accounts are rejected here.
    /// </summary>
    public async Task<LoginResult> LoginAdminAsync(AdminLoginRequest req)
    {
        var username = (req.Username ?? "").Trim();
        // Match the admin username case-insensitively (Person.Email stores it). Admins type a
        // handle like "smak", not an email, so casing/whitespace shouldn't read as wrong credentials.
        var lowered = username.ToLowerInvariant();
        var person = await _db.People.FirstOrDefaultAsync(p => p.Email != null && p.Email.ToLower() == lowered)
            ?? throw new UnauthorizedException("Invalid admin credentials");

        if (!_passwords.Verify(req.Password ?? "", person.Password))
            throw new UnauthorizedException("Invalid admin credentials");

        var isAdmin = await _db.Systemadmins.AsNoTracking().AnyAsync(a => a.Personid == person.Personid);
        if (!isAdmin) throw new ForbiddenException("This account is not an administrator");

        var tokens = _tokens.Issue(person.Personid, person.Email, "admin", null);
        person.RefreshToken = tokens.RefreshToken;
        await _db.SaveChangesAsync();

        return new LoginResult(
            new LoginData
            {
                User = new LoginUser
                {
                    Id = person.Personid.ToString(),
                    Name = FullName(person),
                    Email = person.Email,
                    Role = "admin",
                    StoreId = null,
                    Image = person.ImageUrl,
                },
            },
            tokens);
    }

    public async Task<RefreshResult> RefreshAsync(RefreshRequest req)
    {
        var principal = _tokens.ValidateRefreshToken(req.RefreshToken)
            ?? throw new UnauthorizedException("Invalid or expired refresh token");

        var sub = principal.FindFirst("sub")?.Value;
        if (!int.TryParse(sub, out var personId))
            throw new UnauthorizedException("Invalid refresh token");

        var person = await _db.People.FirstOrDefaultAsync(p => p.Personid == personId);
        if (person is null || person.RefreshToken != req.RefreshToken)
            throw new UnauthorizedException("Invalid refresh token");

        var (role, sellerId) = await DetermineRoleAsync(personId);
        var tokens = _tokens.Issue(personId, person.Email, role, sellerId);

        person.RefreshToken = tokens.RefreshToken;
        await _db.SaveChangesAsync();

        return new RefreshResult(tokens);
    }

    /// <summary>
    /// Resolves the current user's session shape (id, name, email, role, storeId) from a person id.
    /// Role is re-derived live so an approval/disable that happened since login is reflected on the
    /// next page load. Powers GET /auth/me, which the SPA calls to rehydrate from the cookie.
    /// </summary>
    public async Task<LoginUser> GetSessionAsync(int personId)
    {
        var person = await _db.People.AsNoTracking().FirstOrDefaultAsync(p => p.Personid == personId)
            ?? throw new UnauthorizedException("Session not found");

        var (role, sellerId) = await DetermineRoleAsync(personId);
        return new LoginUser
        {
            Id = person.Personid.ToString(),
            Name = FullName(person),
            Email = person.Email,
            Role = role,
            StoreId = sellerId?.ToString(),
            Image = person.ImageUrl,
        };
    }

    /// <summary>Revokes the stored refresh token so it can no longer mint new sessions.</summary>
    public async Task LogoutAsync(int personId)
    {
        var person = await _db.People.FirstOrDefaultAsync(p => p.Personid == personId);
        if (person is null) return;
        person.RefreshToken = null;
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Best-effort revoke from a refresh-token value (used by admin logout, which is anonymous so the
    /// access token may already be expired). Parses the person id out of the refresh JWT and revokes.
    /// </summary>
    public async Task LogoutByRefreshTokenAsync(string refreshToken)
    {
        var principal = _tokens.ValidateRefreshToken(refreshToken);
        var sub = principal?.FindFirst("sub")?.Value;
        if (int.TryParse(sub, out var personId)) await LogoutAsync(personId);
    }
}
