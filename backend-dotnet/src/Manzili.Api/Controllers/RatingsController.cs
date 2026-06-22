using FluentValidation;
using Manzili.Api.Common;
using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

[Route("api/v1/ratings")]
public sealed class RatingsController : ApiController
{
    private readonly RatingService _ratings;
    private readonly IValidator<CreateRatingRequest> _createValidator;

    public RatingsController(RatingService ratings, IValidator<CreateRatingRequest> createValidator)
    {
        _ratings = ratings;
        _createValidator = createValidator;
    }

    // POST /api/v1/ratings  ([Authorize])
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateRatingRequest req)
    {
        await ValidateAsync(_createValidator, req);
        var data = await _ratings.CreateRatingAsync(RequirePersonId, req);
        return ApiOk(data, statusCode: 201);
    }

    // GET /api/v1/ratings?productId=  (optionalAuth — productId required)
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? productId)
    {
        if (string.IsNullOrEmpty(productId))
            throw new ValidationAppException(new[]
            {
                new { path = "productId", message = "productId query parameter is required" }
            });

        var data = await _ratings.ListRatingsAsync(productId);
        return ApiOk(data);
    }
}
