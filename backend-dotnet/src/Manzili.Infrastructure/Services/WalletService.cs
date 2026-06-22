using Manzili.Application.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of Node services/wallet.service.js.
/// Wallet balances are split into two buckets: PENDING and AVAILABLE.
/// Every balance mutation also writes an immutable wallet_transactions row keyed by
/// an idempotency_key, so re-posting the same key is a no-op (applied=false).
/// </summary>
public sealed class WalletService
{
    private readonly ManziliDbContext _db;

    public WalletService(ManziliDbContext db) => _db = db;

    /// <summary>Get-or-create the seller's wallet (pending=0, available=0, currency=EGP).</summary>
    public async Task<SellerWallet> EnsureWalletAsync(int sellerid)
    {
        var wallet = await _db.SellerWallets.FirstOrDefaultAsync(w => w.Sellerid == sellerid);
        if (wallet is null)
        {
            wallet = new SellerWallet
            {
                Sellerid = sellerid,
                PendingBalance = 0m,
                AvailableBalance = 0m,
                Currency = "EGP",
                CreatedAt = DateTime.UtcNow,
            };
            _db.SellerWallets.Add(wallet);
            await _db.SaveChangesAsync();
        }
        return wallet;
    }

    public async Task<WalletDto> GetWalletAsync(int sellerid)
    {
        var wallet = await EnsureWalletAsync(sellerid);

        var transactions = await _db.WalletTransactions
            .AsNoTracking()
            .Where(t => t.WalletId == wallet.WalletId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .ToListAsync();

        return new WalletDto
        {
            PendingBalance = (double)wallet.PendingBalance,
            AvailableBalance = (double)wallet.AvailableBalance,
            Currency = wallet.Currency,
            BankDetails = new BankDetailsDto
            {
                BankName = wallet.BankName,
                AccountHolder = wallet.BankAccountHolder,
                Last4 = wallet.BankLast4,
                Configured = !string.IsNullOrWhiteSpace(wallet.BankLast4) || !string.IsNullOrWhiteSpace(wallet.BankName),
            },
            Transactions = transactions.Select(t => new WalletTransactionDto
            {
                Id = t.TransactionId.ToString(),
                Type = t.Type,
                Bucket = t.Bucket,
                Amount = (double)t.Amount,
                CreatedAt = ToIso(t.CreatedAt)!,
            }).ToList(),
        };
    }

    public sealed record PostResult(SellerWallet Wallet, WalletTransaction Transaction, bool Applied);

    /// <summary>
    /// Idempotently posts a wallet transaction and adjusts the matching bucket balance.
    /// PENDING bucket → pending_balance; otherwise → available_balance.
    /// If a transaction with the same idempotency_key already exists, returns applied=false
    /// and does NOT touch the balance (immutable, exactly-once semantics).
    /// </summary>
    public async Task<PostResult> PostWalletTransactionAsync(
        int sellerid,
        string type,
        string bucket,
        decimal amount,
        string idempotencyKey,
        string currency = "EGP",
        int? storeOrderId = null)
    {
        var wallet = await EnsureWalletAsync(sellerid);

        var existing = await _db.WalletTransactions
            .FirstOrDefaultAsync(t => t.WalletId == wallet.WalletId && t.IdempotencyKey == idempotencyKey);
        if (existing is not null)
            return new PostResult(wallet, existing, false);

        await using var tx = await _db.Database.BeginTransactionAsync();

        if (bucket == "PENDING")
            wallet.PendingBalance += amount;
        else
            wallet.AvailableBalance += amount;

        var transaction = new WalletTransaction
        {
            WalletId = wallet.WalletId,
            Type = type,
            Bucket = bucket,
            Amount = amount,
            Currency = currency,
            IdempotencyKey = idempotencyKey,
            StoreOrderid = storeOrderId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.WalletTransactions.Add(transaction);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return new PostResult(wallet, transaction, true);
    }

    /// <summary>
    /// Credits a paid store order to the seller's PENDING bucket (SALE_CREDIT) then debits the
    /// Manzili commission (COMMISSION_DEBIT) and the seller's 75% share of the Bosta delivery fee
    /// (SHIPPING_DEBIT). All three are idempotent per store order, so re-running fulfillment never
    /// double-posts. Net pending = sale − commission − sellerShippingShare.
    /// </summary>
    public async Task CreditSaleAsync(
        int sellerid, int storeOrderId, decimal saleAmount, decimal commission, decimal sellerShippingShare, string currency = "EGP")
    {
        await PostWalletTransactionAsync(
            sellerid, "SALE_CREDIT", "PENDING", saleAmount,
            idempotencyKey: $"sale_so_{storeOrderId}", currency, storeOrderId);

        if (commission > 0m)
            await PostWalletTransactionAsync(
                sellerid, "COMMISSION_DEBIT", "PENDING", -commission,
                idempotencyKey: $"comm_so_{storeOrderId}", currency, storeOrderId);

        if (sellerShippingShare > 0m)
            await PostWalletTransactionAsync(
                sellerid, "SHIPPING_DEBIT", "PENDING", -sellerShippingShare,
                idempotencyKey: $"ship_so_{storeOrderId}", currency, storeOrderId);
    }

    /// <summary>
    /// On delivery: moves the net PENDING amount accumulated for a store order into AVAILABLE.
    /// Idempotent via key "release_so_{id}". For COD this is the settlement step (cash collected
    /// by Bosta → seller funds become withdrawable).
    /// </summary>
    public async Task ReleaseStoreOrderFundsAsync(int sellerid, int storeOrderId, string currency = "EGP")
    {
        var wallet = await EnsureWalletAsync(sellerid);
        var releaseKey = $"release_so_{storeOrderId}";
        if (await _db.WalletTransactions.AnyAsync(t => t.WalletId == wallet.WalletId && t.IdempotencyKey == releaseKey))
            return;

        var net = await _db.WalletTransactions
            .Where(t => t.WalletId == wallet.WalletId && t.StoreOrderid == storeOrderId && t.Bucket == "PENDING")
            .SumAsync(t => (decimal?)t.Amount) ?? 0m;
        if (net <= 0m) return;

        await using var tx = await _db.Database.BeginTransactionAsync();
        wallet.PendingBalance -= net;
        wallet.AvailableBalance += net;
        _db.WalletTransactions.Add(new WalletTransaction
        {
            WalletId = wallet.WalletId,
            Type = "COD_RELEASE",
            Bucket = "AVAILABLE",
            Amount = net,
            Currency = currency,
            IdempotencyKey = releaseKey,
            StoreOrderid = storeOrderId,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    /// <summary>
    /// On a return: reverses the net amount previously credited for a store order. If the funds
    /// were already released to AVAILABLE we debit AVAILABLE; otherwise we debit PENDING.
    /// Idempotent via key "return_so_{id}".
    /// </summary>
    public async Task ReverseStoreOrderFundsAsync(int sellerid, int storeOrderId, string currency = "EGP")
    {
        var wallet = await EnsureWalletAsync(sellerid);
        var key = $"return_so_{storeOrderId}";
        if (await _db.WalletTransactions.AnyAsync(t => t.WalletId == wallet.WalletId && t.IdempotencyKey == key))
            return;

        var net = await _db.WalletTransactions
            .Where(t => t.WalletId == wallet.WalletId && t.StoreOrderid == storeOrderId
                && (t.Type == "SALE_CREDIT" || t.Type == "COMMISSION_DEBIT" || t.Type == "SHIPPING_DEBIT"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0m;
        if (net <= 0m) return;

        var released = await _db.WalletTransactions
            .AnyAsync(t => t.WalletId == wallet.WalletId && t.StoreOrderid == storeOrderId && t.Type == "COD_RELEASE");
        var bucket = released ? "AVAILABLE" : "PENDING";

        await PostWalletTransactionAsync(
            sellerid, "SALE_REVERSAL", bucket, -net,
            idempotencyKey: key, currency, storeOrderId);
    }

    public async Task<PayoutResult> RequestPayoutAsync(int sellerid, RequestPayoutRequest body)
    {
        var wallet = await EnsureWalletAsync(sellerid);
        if (wallet.AvailableBalance < body.Amount)
            throw new ValidationAppException("Insufficient available balance");

        await PostWalletTransactionAsync(
            sellerid,
            type: "PAYOUT",
            bucket: "AVAILABLE",
            amount: -body.Amount,
            idempotencyKey: $"payout_{sellerid}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}");

        _db.Payouts.Add(new Payout
        {
            Sellerid = sellerid,
            Amount = body.Amount,
            Status = 0,
        });
        await _db.SaveChangesAsync();

        return new PayoutResult { Message = "Payout requested", Amount = body.Amount };
    }

    public async Task<string> UpdateBankDetailsAsync(int sellerid, UpdateBankDetailsRequest body)
    {
        var wallet = await EnsureWalletAsync(sellerid);

        wallet.BankName = body.BankName;
        wallet.BankAccountHolder = body.AccountHolder;
        wallet.BankLast4 = body.AccountNumber is { Length: > 0 } acct
            ? acct[Math.Max(0, acct.Length - 4)..]
            : null;
        wallet.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return "Bank details updated";
    }

    /// <summary>
    /// Moves PENDING SALE_CREDIT transactions older than holdDays into AVAILABLE.
    /// Each release is idempotent via key "release_{transactionId}". Not wired to an
    /// HTTP endpoint (mirrors Node) but available for the funds-release job.
    /// </summary>
    public async Task<(decimal Released, int Count)> ReleasePendingFundsAsync(int sellerid, int holdDays = 7)
    {
        var wallet = await EnsureWalletAsync(sellerid);
        var cutoff = DateTime.UtcNow.AddDays(-holdDays);

        var pendingTxns = await _db.WalletTransactions
            .Where(t => t.WalletId == wallet.WalletId
                && t.Bucket == "PENDING"
                && t.Type == "SALE_CREDIT"
                && t.CreatedAt < cutoff)
            .ToListAsync();

        decimal released = 0m;
        foreach (var txn in pendingTxns)
        {
            var releaseKey = $"release_{txn.TransactionId}";
            var exists = await _db.WalletTransactions
                .AnyAsync(t => t.WalletId == wallet.WalletId && t.IdempotencyKey == releaseKey);
            if (exists) continue;

            var amt = txn.Amount;

            await using var tx = await _db.Database.BeginTransactionAsync();
            wallet.PendingBalance -= amt;
            wallet.AvailableBalance += amt;
            _db.WalletTransactions.Add(new WalletTransaction
            {
                WalletId = wallet.WalletId,
                Type = "RELEASE",
                Bucket = "AVAILABLE",
                Amount = amt,
                Currency = wallet.Currency,
                IdempotencyKey = releaseKey,
                CreatedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            released += amt;
        }

        return (released, pendingTxns.Count);
    }

    private static string? ToIso(DateTime? dt)
    {
        if (dt is null) return null;
        var value = dt.Value;
        if (value.Kind == DateTimeKind.Unspecified)
            value = DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
    }
}
