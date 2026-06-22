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
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int? page,
        [FromQuery] int? limit,
        [FromQuery] string? category,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDir)
    {
        var pg = Pagination.Parse(page, limit);
        var result = await _products.ListProductsAsync(pg, category, sortBy, sortDir, CurrentPersonId);
        return PagedResponse(result);
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
