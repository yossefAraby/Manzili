namespace Manzili.Application.Seller;

public sealed class WalletDto
{
    public double PendingBalance { get; set; }
    public double AvailableBalance { get; set; }
    public string Currency { get; set; } = "EGP";
    /// <summary>Saved payout/financial details (masked) so the seller sees their persisted setup.</summary>
    public BankDetailsDto? BankDetails { get; set; }
    public IReadOnlyList<WalletTransactionDto> Transactions { get; set; } = [];
}

public sealed class BankDetailsDto
{
    public string? BankName { get; set; }
    public string? AccountHolder { get; set; }
    /// <summary>Only the last 4 digits are stored/returned — never the full account number.</summary>
    public string? Last4 { get; set; }
    public bool Configured { get; set; }
}

public sealed class WalletTransactionDto
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "";
    public string Bucket { get; set; } = "";
    public double Amount { get; set; }
    public string CreatedAt { get; set; } = "";
}

public sealed class RequestPayoutRequest
{
    public decimal Amount { get; set; }
}

public sealed class PayoutResult
{
    public string Message { get; set; } = "";
    public decimal Amount { get; set; }
}

public sealed class UpdateBankDetailsRequest
{
    public string? BankName { get; set; }
    public string? AccountHolder { get; set; }
    public string? AccountNumber { get; set; }
}
