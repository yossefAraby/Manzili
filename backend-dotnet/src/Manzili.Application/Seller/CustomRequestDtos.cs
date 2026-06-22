namespace Manzili.Application.Seller;

public sealed class CustomRequestDto
{
    public string Id { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string Description { get; set; } = "";
    public IReadOnlyList<string> Images { get; set; } = [];
    public string Visibility { get; set; } = "open";
    public string Category { get; set; } = "";
    public int Quantity { get; set; }
    public CustomRequestSizeDto? Size { get; set; }
    public string? Material { get; set; }
    public string? DeliveryDate { get; set; }
    public string? VoiceMemoUrl { get; set; }
    public string? StoreId { get; set; }
    public short? Status { get; set; }
    public string? CreatedAt { get; set; }
}

public sealed class CustomRequestSizeDto
{
    public double? Length { get; set; }
    public double? Width { get; set; }
    public double? Height { get; set; }
}
