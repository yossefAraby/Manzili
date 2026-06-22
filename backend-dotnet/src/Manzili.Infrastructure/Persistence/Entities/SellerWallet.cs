using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class SellerWallet
{
    public int WalletId { get; set; }

    public int Sellerid { get; set; }

    public decimal PendingBalance { get; set; }

    public decimal AvailableBalance { get; set; }

    public string Currency { get; set; } = null!;

    public string? StripeAccountId { get; set; }

    public string? BankName { get; set; }

    public string? BankAccountHolder { get; set; }

    public string? BankLast4 { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Seller Seller { get; set; } = null!;

    public virtual ICollection<WalletTransaction> WalletTransactions { get; set; } = new List<WalletTransaction>();
}
