namespace Manzili.Application.Seller;

public sealed class CouponDto
{
    public string Id { get; set; } = "";
    public string Code { get; set; } = "";
    public double Discount { get; set; }
    public string Description { get; set; } = "";
    public string Scope { get; set; } = "STORE";
    public int MaxUsers { get; set; }
    public int UsedCount { get; set; }
    public string? ExpiryDate { get; set; }
    public bool IsActive { get; set; }
}

public sealed class CouponsResult
{
    public IReadOnlyList<CouponDto> Coupons { get; set; } = [];
}

public sealed class CreateCouponRequest
{
    public string? Code { get; set; }
    public string? Description { get; set; }
    public decimal Discount { get; set; }
    public string? Scope { get; set; }
    public int? MaxUsers { get; set; }
    public string? ExpiryDate { get; set; }
    public List<string>? ProductIds { get; set; }
}

public sealed class ValidateCouponRequest
{
    public string? Code { get; set; }
}

public sealed class ValidateCouponResult
{
    public bool Valid { get; set; }
    public string? Code { get; set; }
    public double Discount { get; set; }
    public string Scope { get; set; } = "STORE";
    public IReadOnlyList<string> ProductIds { get; set; } = [];
    public string? ExpiryDate { get; set; }
    public int MaxUsers { get; set; }
}
