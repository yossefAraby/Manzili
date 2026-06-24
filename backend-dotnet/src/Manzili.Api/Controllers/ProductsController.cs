using Manzili.Api.Common;
using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/products")]
public sealed class ProductsController : ApiController
{
    private readonly ProductService _products;

    public ProductsController(ProductService products)
    {
        _products = products;
    }

    // GET /api/v1/products  (optionalAuth)
    // Server-side filtering + pagination for the shop grid: category (one or several,
    // comma-separated), free-text search, price band, stock, and sort — all applied in
    // SQL so each page hits the DB for just that slice.
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int? page,
        [FromQuery] int? limit,
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] bool? inStock,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDir,
        [FromQuery] string? city)
    {
        var pg = Pagination.Parse(page, limit);
        var filter = new ProductListFilter(category, search, minPrice, maxPrice, inStock, sortBy, sortDir, city);
        var result = await _products.ListProductsAsync(pg, filter, CurrentPersonId);
        return PagedResponse(result);
    }

    // GET /api/v1/products/cities  (public) — distinct cities that have active stores, for the
    // shop "filter by city" dropdown.
    [HttpGet("cities")]
    public async Task<IActionResult> Cities()
    {
        var cities = await _products.ListSellerCitiesAsync();
        return ApiOk(new { cities });
    }

    // GET /api/v1/products/featured  (optionalAuth)
    [HttpGet("featured")]
    public async Task<IActionResult> Featured([FromQuery] int? page, [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var result = await _products.ListFeaturedAsync(pg, CurrentPersonId);
        return PagedResponse(result);
    }

    // GET /api/v1/products/latest  (optionalAuth)
    [HttpGet("latest")]
    public async Task<IActionResult> Latest([FromQuery] int? page, [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var result = await _products.ListLatestAsync(pg, CurrentPersonId);
        return PagedResponse(result);
    }

    // GET /api/v1/products/{id}  (optionalAuth)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var data = await _products.GetProductByIdAsync(id, CurrentPersonId);
        return ApiOk(data);
    }

    // POST /api/v1/products/{id}/view  (optionalAuth) — records a recently-viewed taste signal for
    // recommendations. No-op for guests; the product page fires this fire-and-forget on load.
    [HttpPost("{id:int}/view")]
    public async Task<IActionResult> RecordView(int id)
    {
        await _products.RecordViewAsync(CurrentPersonId, id);
        return ApiOk(new { recorded = CurrentPersonId != null });
    }

    private IActionResult PagedResponse(PagedProducts<ProductCardDto> result) =>
        ApiOk(
            new { ProductCards = result.Items },
            new Dictionary<string, object?>
            {
                ["total"] = result.Total,
                ["page"] = result.Page,
                ["limit"] = result.Limit,
            });
}
