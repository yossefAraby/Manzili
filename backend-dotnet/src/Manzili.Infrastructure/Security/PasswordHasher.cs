namespace Manzili.Infrastructure.Security;

/// <summary>
/// BCrypt password hashing, mirroring Node utils/password.js (bcrypt, 10 salt rounds).
/// BCrypt.Net verifies $2a$/$2b$/$2y$ hashes, so existing Node-created hashes work unchanged.
/// </summary>
public sealed class PasswordHasher
{
    private const int WorkFactor = 10;

    public string Hash(string plain) => BCrypt.Net.BCrypt.HashPassword(plain, WorkFactor);

    public bool Verify(string plain, string hash) => BCrypt.Net.BCrypt.Verify(plain, hash);
}
