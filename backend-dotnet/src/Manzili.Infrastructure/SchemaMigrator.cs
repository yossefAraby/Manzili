using Manzili.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Manzili.Infrastructure;

/// <summary>
/// Idempotent, additive schema tweaks the app relies on but that aren't in the scaffolded baseline.
/// Runs once at startup (before <see cref="AdminSeeder"/>). Every statement uses
/// <c>ADD COLUMN IF NOT EXISTS</c>, so it's safe to run on every boot and never destroys data.
/// </summary>
public static class SchemaMigrator
{
    public static async Task EnsureAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ManziliDbContext>();

        // Amazon/Noon-style per-option variant metadata: an optional surcharge (price delta added to
        // the base price), a colour swatch hex (for colour groups), and an option image URL.
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE manzili.variant_options ADD COLUMN IF NOT EXISTS price_delta numeric(12,2) NOT NULL DEFAULT 0;");
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE manzili.variant_options ADD COLUMN IF NOT EXISTS swatch varchar(20);");
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE manzili.variant_options ADD COLUMN IF NOT EXISTS image_url varchar(500);");
    }
}
