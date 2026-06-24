using Manzili.Api.Common;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/search")]
public sealed class SearchController : ApiController
{
    private readonly SearchService _search;
    private readonly SemanticSearchService _semantic;

    public SearchController(SearchService search, SemanticSearchService semantic)
    {
        _search = search;
        _semantic = semantic;
    }

    // GET /api/v1/search?q=&page=&limit=  (optionalAuth) — lexical name/description match.
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] int? page,
        [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var (products, total) = await _search.SearchAsync(q, pg, CurrentPersonId);
        return ApiOk(
            new { products },
            new Dictionary<string, object?> { ["total"] = total });
    }

    // GET /api/v1/search/semantic?q=&page=&limit=  (optionalAuth) — AI "describe-it" vector search.
    // Embeds the query and ranks the catalog by meaning (pgvector); falls back to lexical when needed.
    [HttpGet("semantic")]
    public async Task<IActionResult> Semantic(
        [FromQuery] string? q,
        [FromQuery] int? page,
        [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var (products, total, mode) = await _semantic.SearchAsync(q, pg, CurrentPersonId);
        return ApiOk(
            new { products },
            new Dictionary<string, object?> { ["total"] = total, ["mode"] = mode });
    }

    // GET /api/v1/search/recommend?seeds=10,7,8&limit=4  (optionalAuth) — ONE engine for both the
    // home "For You" rail and the product-page "Recommended for you": nearest products to the seed
    // centroid (product page → the viewed product; home → the shopper's engaged products). Zero
    // tokens (seeds are already embedded). Falls back to category/popular when there are no vectors.
    [HttpGet("recommend")]
    public async Task<IActionResult> Recommend(
        [FromQuery] string? seeds,
        [FromQuery] int? limit)
    {
        var count = Math.Clamp(limit ?? 4, 1, 12);
        var seedIds = (seeds ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => int.TryParse(s, out var i) ? i : 0)
            .Where(i => i > 0)
            .Distinct()
            .Take(50)
            .ToList();
        var products = await _semantic.RecommendByVectorAsync(seedIds, count, CurrentPersonId);
        return ApiOk(new { productCards = products });
    }
}
