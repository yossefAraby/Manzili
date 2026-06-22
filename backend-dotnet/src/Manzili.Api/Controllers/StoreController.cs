using FluentValidation;
using Manzili.Api.Common;
using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

// Node mounts store.routes at BOTH /store and /stores (routes/index.js), so every
// action below is reachable under both prefixes (e.g. /stores/apply, /store/{id}).
[Route("api/v1/store")]
[Route("api/v1/stores")]
public sealed class StoreController : ApiController
{
    private readonly StoreService _store;
    private readonly IValidator<StoreApplyRequest> _applyValidator;

    public StoreController(StoreService store, IValidator<StoreApplyRequest> applyValidator)
    {
        _store = store;
        _applyValidator = applyValidator;
    }

    // POST /api/v1/stores/apply  ([Authorize])
    [HttpPost("apply")]
    [Authorize]
    public async Task<IActionResult> Apply([FromBody] StoreApplyRequest req)
    {
        await ValidateAsync(_applyValidator, req);
        var message = await _store.ApplyForStoreAsync(RequirePersonId, req);
        // Node: success(res, null, { message }, 201) -> { success:true, data:null, message }
        return ApiOk(null, new Dictionary<string, object?> { ["message"] = message }, statusCode: 201);
    }

    // GET /api/v1/stores/my-application  ([Authorize]) — the caller's own verification status.
    [HttpGet("my-application")]
    [Authorize]
    public async Task<IActionResult> MyApplication()
    {
        var data = await _store.GetMyApplicationAsync(RequirePersonId);
        return ApiOk(data);
    }

    // GET /api/v1/stores/by-username/{username}  (optionalAuth)
    [HttpGet("by-username/{username}")]
    public async Task<IActionResult> GetByUsername(string username)
    {
        var data = await _store.GetStoreByUsernameAsync(username);
        return ApiOk(data);
    }

    // GET /api/v1/store/{id}  (optionalAuth)
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var data = await _store.GetStoreByIdAsync(id);
        return ApiOk(data);
    }

    // GET /api/v1/store/{id}/custom-work  (public) — completed custom pieces for the store profile.
    [HttpGet("{id}/custom-work")]
    public async Task<IActionResult> GetCustomWork(string id)
    {
        var data = await _store.GetCustomWorkAsync(id);
        return ApiOk(new { customWork = data });
    }

    // GET /api/v1/store/{id}/products  (optionalAuth)
    [HttpGet("{id}/products")]
    public async Task<IActionResult> GetProducts(
        string id,
        [FromQuery] int? page,
        [FromQuery] int? limit)
    {
        var pg = Pagination.Parse(page, limit);
        var result = await _store.GetStoreProductsAsync(id, pg, CurrentPersonId);
        return ApiOk(
            new { products = result.Items },
            new Dictionary<string, object?>
            {
                ["total"] = result.Total,
                ["page"] = result.Page,
                ["limit"] = result.Limit,
            });
    }
}
