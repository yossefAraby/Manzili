using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class ProductImage
{
    public int ProductImageid { get; set; }

    public byte[] Productimage { get; set; } = null!;

    public DateOnly UploadDate { get; set; }

    public int Productid { get; set; }

    public string? ImageUrl { get; set; }

    public virtual Product Product { get; set; } = null!;
}
