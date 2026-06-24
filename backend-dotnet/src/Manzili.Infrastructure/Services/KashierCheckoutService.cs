using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Manzili.Application.Integrations;
using Manzili.Application.Orders;
using Manzili.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Kashier (Egyptian gateway) checkout via the Hosted Payment Page. Mirrors the Stripe slice:
/// reuse <see cref="OrderService.CreateOrderAsync"/> to persist a server-trusted order, derive the
/// amount from <see cref="CheckoutPricingService"/> (never the client), build a signed HPP redirect
/// URL, and converge both the redirect-confirm and the webhook on the idempotent
/// <see cref="FulfillmentService.MarkOrderPaidAndFulfillAsync"/>.
///
/// One Kashier integration powers two branded buyer options: <b>Mobile Wallet</b>
/// (<c>allowedMethods=wallet</c>) and <b>Fawry</b> (<c>allowedMethods=fawry</c>) — for both the cart
/// and custom-order milestone payments. HPP needs no server pre-registration call: we compute the
/// order <c>hash</c> (HMAC-SHA256 over the payment path with the API key) and redirect the buyer.
/// </summary>
public sealed class KashierCheckoutService
{
    private readonly ManziliDbContext _db;
    private readonly OrderService _orders;
    private readonly OfferService _offers;
    private readonly PromotionService _promotions;
    private readonly CheckoutPricingService _pricing;
    private readonly FulfillmentService _fulfillment;
    private readonly KashierOptions _kashier;
    private readonly AppOptions _app;

    public KashierCheckoutService(
        ManziliDbContext db,
        OrderService orders,
        OfferService offers,
        PromotionService promotions,
        CheckoutPricingService pricing,
        FulfillmentService fulfillment,
        IOptions<AppOptions> options)
    {
        _db = db;
        _orders = orders;
        _offers = offers;
        _promotions = promotions;
        _pricing = pricing;
        _fulfillment = fulfillment;
        _kashier = options.Value.Kashier;
        _app = options.Value;
    }

    // ===================== Product-promotion (seller pays Manzili) =====================

    /// <summary>Opens a Kashier mobile-wallet HPP for a seller to pay for a "feature my product"
    /// promotion. On the redirect return <see cref="ConfirmPromotionAsync"/> activates it. The money
    /// is Manzili revenue (never touches the seller wallet).</summary>
    public async Task<CheckoutResult> CreatePromotionPaymentAsync(int sellerId, int productId, string? plan, string? method = "wallet", string? origin = null)
    {
        if (!_kashier.IsConfigured)
            throw new AppException("Kashier not configured", 503, "SERVICE_UNAVAILABLE");

        var owns = await _db.Products.AsNoTracking().AnyAsync(p => p.Productid == productId && p.Sellerid == sellerId);
        if (!owns) throw new NotFoundException("Product");

        var (planName, amountDec, _) = PromotionService.ResolvePlan(plan);
        var amount = amountDec.ToString("0.00", CultureInfo.InvariantCulture);
        var merchantOrderId = $"PROMO-{productId}-{planName}-{sellerId}";

        var baseUrl = _app.ResolveBaseUrl(origin);
        var redirect = $"{baseUrl}/store/manage-product?promo=success&gateway=kashier&productId={productId}&plan={Uri.EscapeDataString(planName)}";
        var failRedirect = $"{baseUrl}/store/manage-product?promo=failed&gateway=kashier";

        var hppUrl = BuildHostedPaymentUrl(merchantOrderId, amount, AllowedMethods(method), redirect, failRedirect);
        return new CheckoutResult { Url = hppUrl, SessionId = merchantOrderId, OrderId = "" };
    }

    /// <summary>Server-trusted confirm of the promotion redirect. Verifies the Kashier signature, and
    /// on SUCCESS activates the promotion (idempotent via the transaction id). The seller id comes from
    /// the authenticated caller, not the query.</summary>
    public async Task<ConfirmCheckoutResult> ConfirmPromotionAsync(int sellerId, int productId, string? plan, string? rawQuery)
    {
        if (!_kashier.IsConfigured)
            throw new AppException("Kashier not configured", 503, "SERVICE_UNAVAILABLE");

        var ordered = ParseQueryOrdered(rawQuery);
        VerifySignatureOrThrow(ordered, PromoExcluded);

        var status = First(ordered, "paymentStatus") ?? First(ordered, "status");
        var transactionId = First(ordered, "transactionId");
        var paid = string.Equals(status, "SUCCESS", StringComparison.OrdinalIgnoreCase);

        if (paid)
            await _promotions.ActivateAsync(sellerId, productId, plan, "KASHIER", transactionId ?? $"kashier-promo-{productId}-{sellerId}");

        return new ConfirmCheckoutResult { Status = paid ? "paid" : (status ?? "unpaid"), Type = "promotion" };
    }

    // ===================== Cart order =====================

    public async Task<CheckoutResult> CreatePaymentAsync(int personId, CheckoutRequest req, string? origin = null)
    {
        if (!_kashier.IsConfigured)
            throw new AppException("Kashier not configured", 503, "SERVICE_UNAVAILABLE");

        var methodLabel = PaymentMethodLabel(req.Method);

        // Persist the order through the same pipeline Stripe uses (paymentMethod = WALLET/FAWRY).
        var createReq = new CreateOrderRequest
        {
            AddressId = req.AddressId,
            PaymentMethod = methodLabel,
            Items = req.Items.Select(i => new CreateOrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                Price = i.Price,
                Variant = i.Variant,
            }).ToList(),
            Coupon = req.Coupon is null ? null : new CreateOrderCoupon
            {
                DiscountAmount = req.Coupon.DiscountAmount,
                Extra = req.Coupon.Extra,
            },
        };

        var order = await _orders.CreateOrderAsync(personId, createReq);
        _ = int.TryParse(order.Id, out var orderId);

        try
        {
            if (order.Items.All(i => i.UnitPrice <= 0m))
                throw new AppException("Order has no priced items", 422, "INVALID_ORDER");

            // Server-trusted total: goods − discount + buyer 25% shipping share. Wallet/Fawry carry
            // no card processing fee, so the quote method is non-STRIPE (no fee line) — matching the
            // total the cart displayed for this method.
            var discount = req.Coupon?.DiscountAmount ?? 0m;
            var breakdown = await _pricing.QuoteAsync(req.Items, discount, methodLabel, addressId: req.AddressId);
            var amount = breakdown.Total.ToString("0.00", CultureInfo.InvariantCulture);

            var baseUrl = _app.ResolveBaseUrl(origin);
            var redirect = $"{baseUrl}/orders?checkout=success&gateway=kashier";
            var failRedirect = $"{baseUrl}/orders?checkout=failed&gateway=kashier";
            var hppUrl = BuildHostedPaymentUrl(order.Id, amount, AllowedMethods(req.Method), redirect, failRedirect);
            return new CheckoutResult { Url = hppUrl, SessionId = order.Id, OrderId = order.Id };
        }
        catch when (orderId > 0)
        {
            await CancelOrphanedOrderAsync(orderId);
            throw;
        }
    }

    /// <summary>
    /// Server-trusted confirm of the cart redirect return. Verifies the Kashier signature exactly as
    /// Kashier's own hppCallback.php does, then on SUCCESS runs the idempotent fulfillment.
    /// <paramref name="rawQuery"/> is the raw return query string (window.location.search).
    /// </summary>
    public async Task<ConfirmCheckoutResult> ConfirmAsync(string? rawQuery)
    {
        if (!_kashier.IsConfigured)
            throw new AppException("Kashier not configured", 503, "SERVICE_UNAVAILABLE");

        var ordered = ParseQueryOrdered(rawQuery);
        VerifySignatureOrThrow(ordered, OrderExcluded);

        var status = First(ordered, "paymentStatus") ?? First(ordered, "status");
        var merchantOrderId = First(ordered, "merchantOrderId") ?? First(ordered, "orderId");
        var transactionId = First(ordered, "transactionId");

        var paid = string.Equals(status, "SUCCESS", StringComparison.OrdinalIgnoreCase);
        if (paid && int.TryParse(merchantOrderId, out var orderId))
            await _fulfillment.MarkOrderPaidAndFulfillAsync(orderId, transactionId);
        // Buyer abandoned / payment failed → cancel the still-unpaid order so it doesn't linger.
        else if (!paid && int.TryParse(merchantOrderId, out var failedOrderId))
            await CancelUnpaidOrderAsync(failedOrderId);

        return new ConfirmCheckoutResult
        {
            Status = paid ? "paid" : (status ?? "unpaid"),
            Type = "order",
            OrderId = merchantOrderId,
        };
    }

    // ===================== Custom-order milestone =====================

    public async Task<CheckoutResult> CreateOfferPaymentAsync(int personId, int offerId, OfferCheckoutRequest req, string? origin = null)
    {
        if (!_kashier.IsConfigured)
            throw new AppException("Kashier not configured", 503, "SERVICE_UNAVAILABLE");

        var offer = await _db.Offers.AsNoTracking().FirstOrDefaultAsync(o => o.OfferId == offerId)
            ?? throw new NotFoundException("Offer");

        var milestone = string.IsNullOrWhiteSpace(req.Milestone) ? "final" : req.Milestone!;
        var isFinal = string.Equals(milestone, "final", StringComparison.OrdinalIgnoreCase);
        // Server-trusted milestone split (ignore the client's amount).
        var milestoneAmount = OfferService.ResolveMilestoneAmount(offer.Price, milestone);
        // Shipping (buyer's 25% share) is collected on the final milestone — when the piece ships.
        var buyerShip = isFinal ? _pricing.Fees.BuyerShip(_pricing.Fees.DefaultShipping) : 0m;
        var total = milestoneAmount + buyerShip;
        var amount = total.ToString("0.00", CultureInfo.InvariantCulture);

        // merchantOrderId is alphanumeric (Kashier accepts strings); one payment per milestone.
        var merchantOrderId = $"OF{offerId}-{milestone}";

        // The milestone/amount/address ride in the redirect (the page is reloaded fresh on return);
        // they're excluded from the signature base — Kashier only signs its own fields.
        var redirect = new StringBuilder($"{_app.ResolveBaseUrl(origin)}/custom/request-view/{offer.Requestid}")
            .Append($"?gateway=kashier&offerId={offerId}")
            .Append($"&milestone={Uri.EscapeDataString(milestone)}")
            .Append($"&amount={Uri.EscapeDataString(amount)}");
        if (!string.IsNullOrWhiteSpace(req.AddressId))
            redirect.Append($"&addressId={Uri.EscapeDataString(req.AddressId!)}");

        var hppUrl = BuildHostedPaymentUrl(merchantOrderId, amount, AllowedMethods(req.Method), redirect.ToString());
        return new CheckoutResult { Url = hppUrl, SessionId = merchantOrderId, OrderId = "" };
    }

    /// <summary>
    /// Server-trusted confirm of a custom-order milestone redirect. Verifies the signature, then on
    /// SUCCESS records the milestone (which finalizes the order on the final milestone) — the analog
    /// of the Stripe offer path's ApplyPaidSessionAsync → RecordPaidMilestoneAsync.
    /// </summary>
    public async Task<ConfirmCheckoutResult> ConfirmOfferAsync(int offerId, OfferKashierConfirmRequest req)
    {
        if (!_kashier.IsConfigured)
            throw new AppException("Kashier not configured", 503, "SERVICE_UNAVAILABLE");

        var ordered = ParseQueryOrdered(req.Query);
        VerifySignatureOrThrow(ordered, OfferExcluded);

        var status = First(ordered, "paymentStatus") ?? First(ordered, "status");
        var paid = string.Equals(status, "SUCCESS", StringComparison.OrdinalIgnoreCase);

        if (paid)
        {
            var milestone = string.IsNullOrWhiteSpace(req.Milestone) ? "final" : req.Milestone!;
            int? addressId = int.TryParse(req.AddressId, out var a) ? a : null;
            await _offers.RecordPaidMilestoneAsync(offerId, milestone, req.Amount, addressId);
        }

        return new ConfirmCheckoutResult
        {
            Status = paid ? "paid" : (status ?? "unpaid"),
            Type = "offer",
            OfferId = offerId.ToString(),
        };
    }

    // ===================== Shared HPP + signing =====================

    // Params Kashier does NOT sign and must be excluded from the redirect signature base.
    private static readonly HashSet<string> OrderExcluded =
        new(StringComparer.OrdinalIgnoreCase) { "signature", "mode", "checkout", "gateway", "session_id" };
    private static readonly HashSet<string> OfferExcluded =
        new(StringComparer.OrdinalIgnoreCase)
        { "signature", "mode", "checkout", "gateway", "session_id", "payment", "offerId", "milestone", "amount", "addressId" };
    private static readonly HashSet<string> PromoExcluded =
        new(StringComparer.OrdinalIgnoreCase)
        { "signature", "mode", "checkout", "gateway", "session_id", "payment", "promo", "productId", "plan" };

    /// <summary>
    /// Builds the HPP redirect. Order hash = HMAC-SHA256( "/?payment={mid}.{order}.{amount}.{ccy}", apiKey )
    /// lowercase hex — Kashier rejects the open if the hash doesn't match exactly.
    /// </summary>
    private string BuildHostedPaymentUrl(string orderId, string amount, string allowedMethods, string merchantRedirect, string? failureRedirect = null)
    {
        var mid = _kashier.MerchantId!;
        var ccy = _kashier.Currency;
        var path = $"/?payment={mid}.{orderId}.{amount}.{ccy}";
        var hash = HmacSha256Hex(path, _kashier.ApiKey!);

        var q = new List<KeyValuePair<string, string>>
        {
            new("merchantId", mid),
            new("orderId", orderId),
            new("amount", amount),
            new("currency", ccy),
            new("hash", hash),
            new("mode", _kashier.Mode),
            new("merchantRedirect", merchantRedirect),
            // Force a GET redirect back to the merchant URL. Without this Kashier can POST the result
            // to the redirect — which a static Next.js page can't receive, so the buyer sees Kashier's
            // generic "A General Error Occurred" even though the payment was approved.
            new("redirectMethod", "get"),
            new("allowedMethods", allowedMethods),
            new("display", "en"),
        };
        // Where Kashier sends the buyer if the payment fails/is declined — so the order doesn't
        // linger as "Pending Payment"; the orders page confirms the (unpaid) return and cancels it.
        if (!string.IsNullOrWhiteSpace(failureRedirect))
            q.Add(new("failureRedirect", failureRedirect!));
        if (!string.IsNullOrWhiteSpace(_kashier.WebhookUrl))
            q.Add(new("serverWebhook", $"{_kashier.WebhookUrl!.TrimEnd('/')}/api/v1/webhooks/kashier"));

        var query = string.Join("&", q.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        var baseUrl = _kashier.BaseUrl.TrimEnd('/');
        return $"{baseUrl}/?{query}";
    }

    /// <summary>
    /// Verifies the redirect signature using Kashier's REAL scheme — the same one the webhook
    /// (<see cref="KashierWebhookService"/>) and Kashier's docs use: hash ONLY the fields named in the
    /// returned <c>signatureKeys</c> param, sorted ALPHABETICALLY, as "k=v&amp;…", HMAC-SHA256'd with the
    /// API key, compared to <c>signature</c>. The old "all params in received order" scheme never
    /// matched Kashier's hash, so an APPROVED wallet payment failed confirm with INVALID_SIGNATURE
    /// (the "A General Error Occurred" symptom). We keep the legacy scheme only as a fallback for the
    /// rare case where no <c>signatureKeys</c> is present. No-op when no signature is present.
    /// </summary>
    private void VerifySignatureOrThrow(List<KeyValuePair<string, string>> ordered, HashSet<string> excluded)
    {
        var signature = First(ordered, "signature");
        if (string.IsNullOrEmpty(signature)) return;

        var sigKeysRaw = First(ordered, "signatureKeys");
        IEnumerable<string> basePairs;
        if (!string.IsNullOrWhiteSpace(sigKeysRaw))
        {
            // Kashier names exactly which fields it signed; hash those, alphabetically (Ordinal),
            // so the merchant's own redirect params (checkout/gateway/etc.) are irrelevant to the hash.
            var keys = sigKeysRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            basePairs = keys.OrderBy(k => k, StringComparer.Ordinal)
                .Select(k => $"{k}={First(ordered, k) ?? ""}");
        }
        else
        {
            // Legacy fallback (no signatureKeys): filtered params in received order.
            basePairs = ordered.Where(kv => !excluded.Contains(kv.Key)).Select(kv => $"{kv.Key}={kv.Value}");
        }

        var expected = HmacSha256Hex(string.Join("&", basePairs), _kashier.ApiKey!);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(signature.Trim())))
            throw new AppException("Invalid Kashier signature", 400, "INVALID_SIGNATURE");
    }

    /// <summary>Maps a buyer method to the Kashier allowedMethods token (restricts the HPP to it).</summary>
    private static string AllowedMethods(string? method) => method?.Trim().ToLowerInvariant() switch
    {
        "wallet" => "wallet",
        "fawry" => "fawry",
        "card" => "card",
        _ => "card,wallet",
    };

    /// <summary>The order's stored PaymentMethod label for the chosen Kashier method.</summary>
    private static string PaymentMethodLabel(string? method) => method?.Trim().ToLowerInvariant() switch
    {
        "wallet" => "WALLET",
        "fawry" => "FAWRY",
        _ => "KASHIER",
    };

    /// <summary>
    /// Parses a raw query string into ordered, URL-decoded key/value pairs (preserving the order the
    /// signature was computed over). Mirrors PHP $_GET: '+' → space, then percent-decode.
    /// </summary>
    private static List<KeyValuePair<string, string>> ParseQueryOrdered(string? rawQuery)
    {
        var list = new List<KeyValuePair<string, string>>();
        if (string.IsNullOrWhiteSpace(rawQuery)) return list;
        var s = rawQuery.TrimStart('?');
        foreach (var part in s.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var eq = part.IndexOf('=');
            var rawKey = eq >= 0 ? part[..eq] : part;
            var rawVal = eq >= 0 ? part[(eq + 1)..] : "";
            list.Add(new(Decode(rawKey), Decode(rawVal)));
        }
        return list;

        static string Decode(string v) => Uri.UnescapeDataString(v.Replace('+', ' '));
    }

    private static string? First(List<KeyValuePair<string, string>> ordered, string key) =>
        ordered.FirstOrDefault(kv => kv.Key.Equals(key, StringComparison.OrdinalIgnoreCase)).Value;

    private static string HmacSha256Hex(string data, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var bytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private async Task CancelOrphanedOrderAsync(int orderId)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Orderid == orderId);
        if (order is null) return;
        order.Status = 5; // CANCELED
        await _db.StoreOrders
            .Where(so => so.Orderid == orderId)
            .ExecuteUpdateAsync(s => s.SetProperty(so => so.Status, "CANCELED"));
        await _db.SaveChangesAsync();
    }

    /// <summary>Cancels an order ONLY if it isn't paid yet — used when the buyer abandons the HPP
    /// (a webhook may have already paid it, so we never cancel a paid order).</summary>
    private async Task CancelUnpaidOrderAsync(int orderId)
    {
        var isPaid = await _db.Orders.AsNoTracking()
            .Where(o => o.Orderid == orderId).Select(o => o.IsPaid).FirstOrDefaultAsync();
        if (isPaid == true) return;
        await CancelOrphanedOrderAsync(orderId);
    }
}
