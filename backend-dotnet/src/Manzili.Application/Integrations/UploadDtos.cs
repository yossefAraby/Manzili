namespace Manzili.Application.Integrations;

/// <summary>
/// Result of a Cloudinary image upload. Mirrors Node services/upload.service.js return shape:
/// { url, publicId, width, height }.
/// </summary>
public sealed class UploadResult
{
    public string Url { get; set; } = "";
    public string PublicId { get; set; } = "";
    public int Width { get; set; }
    public int Height { get; set; }
}
