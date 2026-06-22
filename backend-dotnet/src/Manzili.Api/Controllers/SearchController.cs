using Manzili.Api.Common;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/search")]
public sealed class SearchController : ApiController
{
    private readonly SearchService _search;

    public SearchController(SearchService search)
    {
        _search = search;
    }

    // GET /api/v1/search?q=&page=&limit=  (optionalAuth)
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
}
