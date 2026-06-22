using Manzili.Api.Common;
using Manzili.Application.Common;
using Manzili.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Manzili.Api.Controllers;

/// <summary>
/// Port of Node routes/upload.routes.js + controllers/upload.controller.js. POST /api/v1/upload
/// (authenticated, multipart form field "image"). Enforces the multer limits: 10MB max,
/// image/jpeg|png|webp|gif only. Returns 201 with { url, publicId, width, height }.
/// </summary>
[Route("api/v1/upload")]
[Authorize]
public sealed class UploadController : ApiController
{
    private const long MaxBytes = 10 * 1024 * 1024; // 10MB

    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    };

    private readonly UploadService _upload;

    public UploadController(UploadService upload)
    {
        _upload = upload;
    }

    [HttpPost]
    public async Task<IActionResult> UploadImage([FromForm(Name = "image")] IFormFile? image, CancellationToken ct)
    {
        // Node: upload.single('image') — missing file → upload.service throws 'No file provided' (400).
        if (image is null || image.Length == 0)
            throw new AppException("No file provided", 400, "BAD_REQUEST");

        // multer fileFilter: reject non-image content types.
        if (!AllowedTypes.Contains(image.ContentType))
            throw new AppException("Only image files (jpeg, png, webp, gif) are allowed", 400, "BAD_REQUEST");

        // multer limits.fileSize: 10MB.
        if (image.Length > MaxBytes)
            throw new AppException("File too large (max 10MB)", 400, "BAD_REQUEST");

        await using var stream = image.OpenReadStream();
        var data = await _upload.UploadImageAsync(stream, image.FileName, ct);

        return ApiOk(data, statusCode: 201);
    }
}
