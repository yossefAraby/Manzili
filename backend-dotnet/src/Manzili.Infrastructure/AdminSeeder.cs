using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Manzili.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure;

/// <summary>
/// Ensures the demo admin team exists (idempotent). All log in via the separate admin portal with
/// their <b>name</b> as the username (stored in Person.Email):
/// <list type="bullet">
///   <item><b>yossef</b> / 123456789 — full administrator (no supervisor)</item>
///   <item><b>dinamow</b> / 123456789 — full administrator (no supervisor)</item>
///   <item><b>smak</b> / 123456789 — <i>moderator</i>, supervised by yossef; the full admins manage
///   which dashboard sections smak may access via person_permission.</item>
/// </list>
/// The password is only (re)set when it doesn't already match, and starter moderator permissions
/// are only seeded when none exist — so admin-made changes are never clobbered.
/// </summary>
public static class AdminSeeder
{
    private const string Password = "123456789";

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ManziliDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();

        // Full administrators (no supervisor → access everything).
        var yossefAdminId = await EnsureAdminAsync(db, hasher, "yossef", Password, supervisorAdminId: null);
        await EnsureAdminAsync(db, hasher, "dinamow", Password, supervisorAdminId: null);

        // Moderator supervised by a full admin, with a starter set of sections (orders + reports).
        await EnsureAdminAsync(db, hasher, "smak", Password, supervisorAdminId: yossefAdminId);
        await EnsureDefaultModeratorPermissionsAsync(db, "smak", new[] { 1, 4 });
    }

    private static async Task<int> EnsureAdminAsync(
        ManziliDbContext db, PasswordHasher hasher, string username, string password, int? supervisorAdminId)
    {
        var person = await db.People.FirstOrDefaultAsync(p => p.Email == username);
        if (person is null)
        {
            person = new Person { Email = username, Password = hasher.Hash(password), FirstName = username };
            db.People.Add(person);
            await db.SaveChangesAsync();
        }
        else if (!hasher.Verify(password, person.Password))
        {
            person.Password = hasher.Hash(password);
            await db.SaveChangesAsync();
        }

        var admin = await db.Systemadmins.FirstOrDefaultAsync(a => a.Personid == person.Personid);
        if (admin is null)
        {
            admin = new Systemadmin { Personid = person.Personid, Supervisorid = supervisorAdminId };
            db.Systemadmins.Add(admin);
            await db.SaveChangesAsync();
        }
        else if (supervisorAdminId.HasValue && admin.Supervisorid != supervisorAdminId)
        {
            admin.Supervisorid = supervisorAdminId;
            await db.SaveChangesAsync();
        }
        return admin.Adminid;
    }

    private static async Task EnsureDefaultModeratorPermissionsAsync(ManziliDbContext db, string username, int[] codes)
    {
        var personId = await db.People.Where(p => p.Email == username)
            .Select(p => (int?)p.Personid).FirstOrDefaultAsync();
        if (personId is not int pid) return;

        if (await db.PersonPermissions.AnyAsync(p => p.Personid == pid)) return; // don't overwrite admin edits

        foreach (var code in codes)
            db.PersonPermissions.Add(new PersonPermission { Personid = pid, Permission = code });
        await db.SaveChangesAsync();
    }
}
