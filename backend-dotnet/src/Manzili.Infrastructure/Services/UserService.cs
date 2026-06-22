using Manzili.Application.Account;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/user.service.js.</summary>
public sealed class UserService
{
    private readonly ManziliDbContext _db;

    public UserService(ManziliDbContext db) => _db = db;

    private static string FullName(Person p) =>
        string.Join(" ", new[] { p.FirstName, p.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));

    private static UserProfileDto Map(Person p, bool hasStore) => new()
    {
        Id = p.Personid.ToString(),
        Name = FullName(p),
        Email = p.Email,
        HasStore = hasStore,
        CreatedAt = p.CreatedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
    };

    public async Task<UserProfileDto> GetProfileAsync(int personId)
    {
        var person = await _db.People
            .Include(p => p.Seller)
            .FirstOrDefaultAsync(p => p.Personid == personId)
            ?? throw new NotFoundException("User");

        return Map(person, person.Seller is not null);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(int personId, UpdateProfileRequest req)
    {
        var person = await _db.People
            .Include(p => p.Seller)
            .FirstOrDefaultAsync(p => p.Personid == personId)
            ?? throw new NotFoundException("User");

        if (!string.IsNullOrWhiteSpace(req.Name))
        {
            var parts = req.Name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            person.FirstName = parts.Length > 0 ? parts[0] : req.Name.Trim();
            person.LastName = parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : null;
        }
        if (!string.IsNullOrEmpty(req.Email))
            person.Email = req.Email;

        await _db.SaveChangesAsync();

        return Map(person, person.Seller is not null);
    }
}
