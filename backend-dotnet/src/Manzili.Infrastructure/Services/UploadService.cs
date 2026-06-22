using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Microsoft.Extensions.Options;
using UploadResult = Manzili.Application.Integrations.UploadResult;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of Node services/upload.service.js + config/cloudinary.js. Uploads an image
/// buffer to Cloudinary (folder "manzili") and returns { url, publicId, width, height }.
/// </summary>
public sealed class UploadService
{
    private readonly CloudinaryOptions _options;

    public UploadService(IOptions<AppOptions> options)
    {
        _options = options.Value.Cloudinary;
    }

    public async Task<UploadResult> UploadImageAsync(
        Stream? content, string? fileName, CancellationToken ct = default)
    {
        // Node: if (!file) throw new AppError('No file provided', 400)
        if (content is null)
            throw new AppException("No file provided", 400, "BAD_REQUEST");

        if (!_options.IsConfigured)
            throw new AppException("Cloudinary not configured", 503, "SERVICE_UNAVAILABLE");

        var account = new Account(_options.CloudName, _options.ApiKey, _options.ApiSecret);
        var cloudinary = new Cloudinary(account);

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(fileName ?? "upload", content),
            Folder = "manzili",
        };

        var result = await cloudinary.UploadAsync(uploadParams, ct);

        if (result.Error is not null)
            throw new AppException("Upload failed: " + result.Error.Message, 500, "INTERNAL_ERROR");

        return new UploadResult
        {
            Url = result.SecureUrl?.ToString() ?? "",
            PublicId = result.PublicId ?? "",
            Width = result.Width,
            Height = result.Height,
        };
    }
}
