using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class WalletTransaction
{
    public int TransactionId { get; set; }

    public int WalletId { get; set; }

    public string Type { get; set; } = null!;

    public string Bucket { get; set; } = null!;

    public decimal Amount { get; set; }

    public string Currency { get; set; } = null!;

    public string IdempotencyKey { get; set; } = null!;

    public int? Orderid { get; set; }

    public int? StoreOrderid { get; set; }

    public int? Shipmentid { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual StoreOrder? StoreOrder { get; set; }

    public virtual SellerWallet Wallet { get; set; } = null!;
}
