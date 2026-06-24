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

        // Account-linked cart: the active cart is persisted as a variant-faithful JSON snapshot
        // (productId + quantity + serialized variant) on the buyer's cart row, so a logged-in cart
        // survives logout/device-switch and is never browser-local. Cart prices are always
        // recomputed server-side at checkout, so this column only holds line hints.
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE manzili.cart ADD COLUMN IF NOT EXISTS items_json text;");

        // Paid product promotions ("feature my item"): seller pays Manzili to surface a product in
        // the homepage Featured section for a window. Active rows (expires_at in the future) drive
        // the featured ordering; the platform fills any remaining slots with the most popular items.
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS manzili.promotion (
                promotionid serial PRIMARY KEY,
                productid   int NOT NULL,
                sellerid    int NOT NULL,
                plan        varchar(20) NOT NULL DEFAULT 'day',
                amount      numeric(12,2) NOT NULL DEFAULT 0,
                created_at  timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                starts_at   timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at  timestamp without time zone NOT NULL
            );");
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_promotion_expires ON manzili.promotion (expires_at);");
        // Promotions can now be paid directly (mobile wallet / card), not only from the seller wallet.
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE manzili.promotion ADD COLUMN IF NOT EXISTS payment_method varchar(20) NOT NULL DEFAULT 'WALLET';");
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE manzili.promotion ADD COLUMN IF NOT EXISTS payment_ref text;");

        // Recently-viewed products: a lightweight per-buyer browsing signal that feeds the
        // "Recommended for you" / "For You" taste centroid, so a shopper who only browses (never
        // orders/carts/wishlists) still gets personalized recs instead of the generic popular list.
        // One row per (person, product); a re-view just refreshes viewed_at (most-recent-first).
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS manzili.product_views (
                personid   int NOT NULL,
                productid  int NOT NULL,
                viewed_at  timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (personid, productid)
            );");
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_product_views_person ON manzili.product_views (personid, viewed_at DESC);");
    }
}
