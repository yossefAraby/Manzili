using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class StoreOrder
{
    public int StoreOrderid { get; set; }

    public int Orderid { get; set; }

    public int Sellerid { get; set; }

    public decimal Subtotal { get; set; }

    public decimal DiscountTotal { get; set; }

    public decimal ShippingTotal { get; set; }

    public decimal Total { get; set; }

    public string Status { get; set; } = null!;

    public bool IsPaid { get; set; }

    public string PaymentMethod { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual ICollection<Return> Returns { get; set; } = new List<Return>();

    public virtual Seller Seller { get; set; } = null!;

    public virtual Shipment? Shipment { get; set; }

    public virtual ICollection<StoreOrderItem> StoreOrderItems { get; set; } = new List<StoreOrderItem>();

    public virtual ICollection<WalletTransaction> WalletTransactions { get; set; } = new List<WalletTransaction>();
}
