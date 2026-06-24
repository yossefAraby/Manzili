using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// "Describe-it" semantic search over the product catalog using pgvector. Products are embedded
/// once (on save + a one-off backfill) into manzili.products.embedding; a query is embedded at
/// search time and ranked by cosine distance (the <c>&lt;=&gt;</c> operator) entirely in the DB —
/// so per-query cost is one tiny embedding call, independent of catalog size. Falls back to
/// lexical search whenever embeddings are unconfigured, the query embed fails, or nothing matches.
/// </summary>
public sealed class SemanticSearchService
{
    private readonly ManziliDbContext _db;
    private readonly EmbeddingService _embeddings;
    private readonly ProductService _products;
    private readonly SearchService _lexical;
    private readonly ILogger<SemanticSearchService> _log;

    public SemanticSearchService(
        ManziliDbContext db, EmbeddingService embeddings, ProductService products,
        SearchService lexical, ILogger<SemanticSearchService> log)
    {
        _db = db;
        _embeddings = embeddings;
        _products = products;
        _lexical = lexical;
        _log = log;
    }

    /// <summary>The text we embed for a product: name, category and description carry the meaning.</summary>
    private static string BuildText(string? name, string? category, string? description)
    {
        var parts = new[] { name, category, description }
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!.Trim());
        var text = string.Join(". ", parts);
        return text.Length > 1500 ? text[..1500] : text;
    }

    /// <summary>Embed one product and store its vector (best-effort; never throws to the caller).</summary>
    public async Task IndexProductAsync(int productId, CancellationToken ct = default)
    {
        if (!_embeddings.IsConfigured) return;
        try
        {
            var p = await _db.Products.AsNoTracking()
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Productid == productId, ct);
            if (p is null) return;

            var text = BuildText(p.Productname, p.Category?.CategoryName, p.Description);
            if (string.IsNullOrWhiteSpace(text)) return;

            var vec = await _embeddings.EmbedOneAsync(text, isQuery: false, ct);
            if (vec is null) return;

            var literal = EmbeddingService.ToPgVector(vec);
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE manzili.products SET embedding = {literal}::vector WHERE productid = {productId}", ct);
        }
        catch (Exception e)
        {
            _log.LogWarning(e, "[semantic] indexing product {ProductId} failed", productId);
        }
    }

    /// <summary>Embed every product still missing a vector. Returns how many were indexed.</summary>
    public async Task<int> BackfillAsync(CancellationToken ct = default)
    {
        if (!_embeddings.IsConfigured) return 0;
        var ids = await _db.Database
            .SqlQuery<int>($@"SELECT productid AS ""Value"" FROM manzili.products WHERE embedding IS NULL")
            .ToListAsync(ct);
        var done = 0;
        foreach (var id in ids)
        {
            await IndexProductAsync(id, ct);
            done++;
        }
        _log.LogInformation("[semantic] backfilled {Count} product embeddings", done);
        return done;
    }

    /// <summary>
    /// Semantic search. Embeds the query, ranks the catalog by vector cosine distance in pgvector,
    /// and returns search-card DTOs. Falls back to lexical search if embeddings are off / the embed
    /// call fails / there are no vector hits.
    /// </summary>
    public async Task<(IReadOnlyList<SearchProductDto> Products, int Total, string Mode)> SearchAsync(
        string? q, Pagination pg, int? userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return (new List<SearchProductDto>(), 0, "empty");

        if (!_embeddings.IsConfigured)
        {
            var (lex, lexTotal) = await _lexical.SearchAsync(q, pg, userId);
            return (lex, lexTotal, "lexical");
        }

        var qvec = await _embeddings.EmbedOneAsync(q.Trim(), isQuery: true, ct);
        if (qvec is null)
        {
            var (lex, lexTotal) = await _lexical.SearchAsync(q, pg, userId);
            return (lex, lexTotal, "lexical-fallback");
        }

        var literal = EmbeddingService.ToPgVector(qvec);
        var approved = StatusMaps.StoreStatus.Approved;
        var take = pg.Take;
        var skip = pg.Skip;

        // Rank by cosine distance in the DB (<=> = pgvector cosine distance, smaller = closer), then
        // make the result COUNT relevance-dynamic with a RELATIVE gap: keep only products within
        // `relGap` of the BEST match. This adapts to the query — a precise query (best ~0.4) returns a
        // tight set, a vague-but-valid one (best ~0.8) still returns its near-neighbours — instead of a
        // fixed absolute cutoff, which was simultaneously too strict for vague queries and too loose for
        // precise ones. `maxDistance` is just a hard ceiling: if even the closest product is beyond it,
        // the query matches nothing. Computed entirely in SQL so it's one round-trip.
        var maxDistance = _embeddings.MaxDistance;
        const double relGap = 0.25;
        var ids = await _db.Database.SqlQuery<int>(
            $@"WITH ranked AS (
                   SELECT p.productid AS pid, (p.embedding <=> {literal}::vector) AS dist
                   FROM manzili.products p
                   JOIN manzili.seller s ON s.sellerid = p.sellerid
                   WHERE p.embedding IS NOT NULL
                     AND p.is_disabled IS NOT TRUE
                     AND s.is_active = TRUE
                     AND s.store_status = {approved}
                     AND (p.embedding <=> {literal}::vector) < {maxDistance}
                   ORDER BY dist
                   LIMIT {take} OFFSET {skip}
               )
               SELECT pid AS ""Value"" FROM ranked
               WHERE dist <= (SELECT MIN(dist) FROM ranked) + {relGap}
               ORDER BY dist").ToListAsync(ct);

        // Nothing within the hard ceiling → honest empty (not lexical noise) so the UI/blurb can say
        // "no close matches" rather than padding with unrelated keyword hits.
        if (ids.Count == 0)
            return (new List<SearchProductDto>(), 0, "semantic-empty");

        var products = await _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings)
            .Where(p => ids.Contains(p.Productid))
            .ToListAsync(ct);

        var wishlisted = await _products.GetWishlistedIdsAsync(userId);
        var byId = products.ToDictionary(p => p.Productid);
        // Preserve the vector-ranked order (the DB returned ids best-first).
        var ordered = ids.Where(byId.ContainsKey)
            .Select(id => SearchService.MapSearch(byId[id], wishlisted))
            .ToList();

        return (ordered, ordered.Count, "semantic");
    }

    /// <summary>
    /// One recommendation engine for BOTH the home "For You" rail and the product-page "Recommended
    /// for you": rank the catalog by cosine distance to the AVERAGE embedding of a set of SEED
    /// products, excluding the seeds. Product page seeds with the viewed product; home seeds with
    /// the shopper's engaged products (their taste). The seeds are already embedded, so this costs
    /// ZERO AI tokens — a pure DB nearest-neighbour query. Falls back to same-category newest (single
    /// seed) or popular (no/zero useful seeds). Returns shop-card DTOs.
    /// </summary>
    public async Task<IReadOnlyList<ProductCardDto>> RecommendByVectorAsync(
        IReadOnlyList<int> seedIds, int count, int? userId, bool includeTasteSeeds = false, CancellationToken ct = default)
    {
        var seedList = (seedIds ?? Array.Empty<int>()).Where(id => id > 0).Distinct().ToList();

        // Blend in the shopper's recently-viewed products as extra taste seeds (home rail only).
        // This is the core "feels dumb" fix: a browse-only shopper passes no seeds, so without this
        // the centroid query is skipped and everyone gets the same popular list.
        if (includeTasteSeeds && userId is int pid)
        {
            var viewed = await _products.GetRecentlyViewedIdsAsync(pid, 10);
            foreach (var v in viewed)
                if (v > 0 && !seedList.Contains(v)) seedList.Add(v);
        }

        var seeds = seedList.ToArray();

        if (_embeddings.IsConfigured && seeds.Length > 0)
        {
            var approved = StatusMaps.StoreStatus.Approved;
            List<int> ids;
            try
            {
                // Distance to the centroid (AVG) of the seed vectors — the taste/"like this" anchor.
                ids = await _db.Database.SqlQuery<int>(
                    $@"SELECT p.productid AS ""Value""
                       FROM manzili.products p
                       JOIN manzili.seller s ON s.sellerid = p.sellerid
                       WHERE p.embedding IS NOT NULL
                         AND p.productid <> ALL({seeds})
                         AND p.is_disabled IS NOT TRUE
                         AND s.is_active = TRUE
                         AND s.store_status = {approved}
                         AND EXISTS (SELECT 1 FROM manzili.products r WHERE r.productid = ANY({seeds}) AND r.embedding IS NOT NULL)
                       ORDER BY p.embedding <=> (SELECT AVG(r.embedding) FROM manzili.products r WHERE r.productid = ANY({seeds}) AND r.embedding IS NOT NULL)
                       LIMIT {count}").ToListAsync(ct);
            }
            catch (Exception e)
            {
                _log.LogWarning(e, "[semantic] recommend query failed for seeds [{Seeds}]", string.Join(",", seeds));
                ids = new List<int>();
            }

            if (ids.Count > 0) return await LoadCardsAsync(ids, userId, ct);
        }

        // No vectors to anchor on: same-category newest for a single seed, else popular.
        if (seeds.Length == 1) return await FallbackSimilarAsync(seeds[0], count, userId, ct);
        return await FallbackPopularAsync(seeds, count, userId, ct);
    }

    /// <summary>Popular (most-reviewed, then newest) products excluding the seeds — the cold-start
    /// fallback for the home rail when the shopper has no embeddable history.</summary>
    private async Task<IReadOnlyList<ProductCardDto>> FallbackPopularAsync(
        IReadOnlyList<int> excludeIds, int count, int? userId, CancellationToken ct)
    {
        var exclude = (excludeIds ?? Array.Empty<int>()).ToList();
        var products = await _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller).ThenInclude(s => s!.StorePickupAddresses)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings)
            .Where(p => p.IsDisabled != true && p.Seller != null && p.Seller.IsActive == true
                && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved
                && !exclude.Contains(p.Productid))
            .OrderByDescending(p => p.ReviewingAndRatings.Count)
            .ThenByDescending(p => p.CreatedAt)
            .Take(count)
            .ToListAsync(ct);
        var wishlisted = await _products.GetWishlistedIdsAsync(userId);
        return products.Select(p => ProductService.MapCard(p, wishlisted)).ToList();
    }

    /// <summary>Same-category newest products (excluding the viewed one) — used when the vector
    /// nearest-neighbour path can't run (embeddings off, or the product isn't embedded yet).</summary>
    private async Task<IReadOnlyList<ProductCardDto>> FallbackSimilarAsync(
        int productId, int count, int? userId, CancellationToken ct)
    {
        var catId = await _db.Products.AsNoTracking()
            .Where(p => p.Productid == productId)
            .Select(p => p.Categoryid)
            .FirstOrDefaultAsync(ct);

        var query = _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller).ThenInclude(s => s!.StorePickupAddresses)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings)
            .Where(p => p.Productid != productId && p.IsDisabled != true
                && p.Seller != null && p.Seller.IsActive == true
                && p.Seller.StoreStatus == StatusMaps.StoreStatus.Approved);
        if (catId != null) query = query.Where(p => p.Categoryid == catId);

        var products = await query.OrderByDescending(p => p.CreatedAt).Take(count).ToListAsync(ct);
        var wishlisted = await _products.GetWishlistedIdsAsync(userId);
        return products.Select(p => ProductService.MapCard(p, wishlisted)).ToList();
    }

    /// <summary>Load products by id (with the card includes) and map to cards in the given id order.</summary>
    private async Task<IReadOnlyList<ProductCardDto>> LoadCardsAsync(
        IReadOnlyList<int> ids, int? userId, CancellationToken ct)
    {
        var products = await _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller).ThenInclude(s => s!.StorePickupAddresses)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings)
            .Where(p => ids.Contains(p.Productid))
            .ToListAsync(ct);

        var wishlisted = await _products.GetWishlistedIdsAsync(userId);
        var byId = products.ToDictionary(p => p.Productid);
        return ids.Where(byId.ContainsKey)
            .Select(id => ProductService.MapCard(byId[id], wishlisted))
            .ToList();
    }
}
