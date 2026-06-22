using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class StoreOrderItem
{
    public int ItemId { get; set; }

    public int StoreOrderid { get; set; }

    public int Productid { get; set; }

    public int Quantity { get; set; }

    public decimal PriceAtPurchase { get; set; }

    public string ProductName { get; set; } = null!;

    public string? ProductImageUrl { get; set; }

    public string? ShippingSize { get; set; }

    public string? ShippingBulkyCat { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual StoreOrder StoreOrder { get; set; } = null!;
}
