using System.Globalization;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Manzili.Application.Integrations;
using Manzili.Application.Orders;
using Manzili.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Owns the Stripe checkout surface for both standard orders and custom-order milestones, plus a
/// server-trusted confirmation path. STRIPE is managed entirely in the backend (application layer):
/// the frontend only opens the returned <c>url</c> and later asks us to confirm the session.
///
/// Payment is applied via <see cref="ApplyPaidSessionAsync"/>, called from BOTH the Stripe webhook
/// (production-correct) AND <see cref="ConfirmSessionAsync"/> (so the flow completes even when an
/// inbound webhook can't reach the dev machine). Both routes are idempotent.
/// </summary>
public sealed class CheckoutService
{
    private readonly ManziliDbContext _db;
    private readonly OrderService _orders;
    private readonly FulfillmentService _fulfillment;
    private readonly OfferService _offers;
    private readonly PromotionService _promotions;
    private readonly CheckoutPricingService _pricing;
    private readonly StripeOptions _stripe;
    private readonly FeesOptions _fees;
    private readonly AppOptions _app;

    public CheckoutService(
        ManziliDbContext db,
        OrderService orders,
        FulfillmentService fulfillment,
        OfferService offers,
        PromotionService promotions,
        CheckoutPricingService pricing,
        IOptions<AppOptions> options)
    {
        _db = db;
        _orders = orders;
        _fulfillment = fulfillment;
        _offers = offers;
        _promotions = promotions;
        _pricing = pricing;
        _stripe = options.Value.Stripe;
        _fees = options.Value.Fees;
        _app = options.Value;
    }

    // ===================== Product-promotion checkout (seller pays Manzili) =====================

    /// <summary>Opens a Stripe card portal for a seller to pay for a "feature my product" promotion.
    /// On success the promotion is activated via the shared <see cref="ApplyPaidSessionAsync"/> path
    /// (works from both the webhook and the redirect confirm). The money is Manzili revenue.</summary>
    public async Task<CheckoutResult> CreatePromotionCheckoutSessionAsync(int sellerId, int productId, string? plan, string? origin = null)
    {
        if (!_stripe.IsConfigured)
            throw new AppException("Stripe not configured", 503, "SERVICE_UNAVAILABLE");

        var owns = await _db.Products.AsNoTracking().AnyAsync(p => p.Productid == productId && p.Sellerid == sellerId);
        if (!owns) throw new NotFoundException("Product");

        var (planName, amount, _) = PromotionService.ResolvePlan(plan);
        var appUrl = _app.ResolveBaseUrl(origin);

        var sessionOptions = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            Mode = "payment",
            LineItems = new List<SessionLineItemOptions> { MoneyLine($"Featured promotion — {planName}", amount) },
            SuccessUrl = $"{appUrl}/store/manage-product?promo=success&session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{appUrl}/store/manage-product?promo=canceled",
            Metadata = new Dictionary<string, string>
            {
                ["type"] = "promotion",
                ["sellerId"] = sellerId.ToString(),
                ["productId"] = productId.ToString(),
                ["plan"] = planName,
            },
        };

        var session = await new SessionService(new StripeClient(_stripe.SecretKey)).CreateAsync(sessionOptions);
        return new CheckoutResult { Url = session.Url, SessionId = session.Id, OrderId = "" };
    }

    /// <summary>Cart money breakdown for the UI (POST /checkout/quote). Honors the chosen
    /// payment method so a COD quote excludes the Stripe processing fee.</summary>
    public Task<CheckoutBreakdown> QuoteAsync(CheckoutRequest req) =>
        _pricing.QuoteAsync(req.Items, req.Coupon?.DiscountAmount ?? 0m,
            string.Equals(req.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase) ? "COD" : "STRIPE",
            addressId: req.AddressId);

    /// <summary>A positive Stripe line item for a fee/shipping charge.</summary>
    private SessionLineItemOptions MoneyLine(string name, decimal amount) => new()
    {
        PriceData = new SessionLineItemPriceDataOptions
        {
            Currency = _stripe.Currency,
            ProductData = new SessionLineItemPriceDataProductDataOptions { Name = name },
            UnitAmount = (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero),
        },
        Quantity = 1,
    };

    /// <summary>Creates a one-time Stripe coupon for a fixed discount, returns its id (or null).</summary>
    private async Task<string?> CreateDiscountCouponAsync(decimal discount)
    {
        if (discount <= 0m) return null;
        var coupon = await new Stripe.CouponService(new StripeClient(_stripe.SecretKey)).CreateAsync(
            new Stripe.CouponCreateOptions
            {
                AmountOff = (long)Math.Round(discount * 100m, MidpointRounding.AwayFromZero),
                Currency = _stripe.Currency,
                Duration = "once",
                Name = "Manzili discount",
            });
        return coupon.Id;
    }

    // ===================== Standard order checkout =====================

    public async Task<CheckoutResult> CreateCheckoutSessionAsync(int personId, CheckoutRequest req, string? origin = null)
    {
        if (!_stripe.IsConfigured)
            throw new AppException("Stripe not configured", 503, "SERVICE_UNAVAILABLE");

        // Return to the site the checkout was triggered from (localhost vs Vercel), validated
        // against the CORS allowlist — falls back to the configured AppUrl.
        var appUrl = _app.ResolveBaseUrl(origin);

        // Reuse the existing order pipeline with paymentMethod forced to STRIPE.
        var createReq = new CreateOrderRequest
        {
            AddressId = req.AddressId,
            PaymentMethod = "STRIPE",
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
            // Build Stripe goods lines from the server-trusted order (real prices/names),
            // NOT from req.Items: the frontend omits per-item price/name, so trusting the
            // request yields UnitAmount=0 (Stripe rejects -> 500) and would also let a client
            // tamper with the charged price. order.Items.UnitPrice == StoreOrderItem.PriceAtPurchase.
            var lineItems = order.Items.Select(item => new SessionLineItemOptions
            {
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency = _stripe.Currency,
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name = !string.IsNullOrWhiteSpace(item.Name) ? item.Name : $"Product {item.ProductId}",
                    },
                    UnitAmount = (long)Math.Round(item.UnitPrice * 100m, MidpointRounding.AwayFromZero),
                },
                Quantity = item.Quantity,
            }).ToList();

            // Never open a Stripe session whose goods total is 0 — Stripe would reject it
            // (or, with the shipping/fee lines, charge a nonsense tiny amount for real goods).
            if (order.Items.All(i => i.UnitPrice <= 0m))
                throw new AppException("Order has no priced items", 422, "INVALID_ORDER");

            // Buyer also pays their 25% shipping share + the Stripe fee; a coupon discount is
            // applied as a one-time Stripe coupon so the charged total matches Order.Totalamount.
            var discount = req.Coupon?.DiscountAmount ?? 0m;
            var breakdown = await _pricing.QuoteAsync(req.Items, discount, "STRIPE", addressId: req.AddressId);
            if (breakdown.BuyerShippingShare > 0m)
                lineItems.Add(MoneyLine("Shipping (your 25% share)", breakdown.BuyerShippingShare));
            if (breakdown.StripeFee > 0m)
                lineItems.Add(MoneyLine("Payment processing fee", breakdown.StripeFee));
            var couponId = await CreateDiscountCouponAsync(discount);

            // Prefill the buyer's email on the Stripe Checkout page (and the receipt).
            var buyerEmail = await _db.People.AsNoTracking()
                .Where(p => p.Personid == personId)
                .Select(p => p.Email)
                .FirstOrDefaultAsync();

            var sessionOptions = new SessionCreateOptions
            {
                PaymentMethodTypes = new List<string> { "card" },
                LineItems = lineItems,
                Mode = "payment",
                CustomerEmail = string.IsNullOrWhiteSpace(buyerEmail) ? null : buyerEmail,
                // Return to the orders page, which confirms the session then shows Bosta tracking.
                SuccessUrl = $"{appUrl}/orders?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = $"{appUrl}/cart?payment=canceled&orderId={order.Id}",
                Metadata = new Dictionary<string, string> { ["type"] = "order", ["orderId"] = order.Id },
                Discounts = couponId is null
                    ? null
                    : new List<SessionDiscountOptions> { new() { Coupon = couponId } },
            };

            var session = await new SessionService(new StripeClient(_stripe.SecretKey)).CreateAsync(sessionOptions);

            return new CheckoutResult { Url = session.Url, SessionId = session.Id, OrderId = order.Id };
        }
        catch (Exception) when (orderId > 0)
        {
            await CancelOrphanedOrderAsync(orderId);
            throw;
        }
    }

    // ===================== Custom-order milestone checkout =====================

    /// <summary>Opens a Stripe portal for a custom-order milestone (first/second/final).</summary>
    public async Task<CheckoutResult> CreateOfferCheckoutSessionAsync(int personId, int offerId, OfferCheckoutRequest req, string? origin = null)
    {
        if (!_stripe.IsConfigured)
            throw new AppException("Stripe not configured", 503, "SERVICE_UNAVAILABLE");

        var appUrl = _app.ResolveBaseUrl(origin);

        var offer = await _db.Offers.AsNoTracking().FirstOrDefaultAsync(o => o.OfferId == offerId)
            ?? throw new NotFoundException("Offer");

        var milestone = string.IsNullOrWhiteSpace(req.Milestone) ? "final" : req.Milestone!;
        // Server-trusted milestone split (ignore the client's amount).
        var amount = OfferService.ResolveMilestoneAmount(offer.Price, milestone);
        var requestId = offer.Requestid;

        // The buyer pays the Stripe fee on every milestone; shipping (their 25% share) is added on
        // the final milestone, which is when the piece actually ships.
        var isFinal = string.Equals(milestone, "final", StringComparison.OrdinalIgnoreCase);
        var buyerShip = isFinal ? _fees.BuyerShip(_fees.DefaultShipping) : 0m;
        var stripeFee = _fees.StripeFee(amount + buyerShip);

        var lineItems = new List<SessionLineItemOptions>
        {
            MoneyLine($"Custom order — {milestone} payment", amount),
        };
        if (buyerShip > 0m) lineItems.Add(MoneyLine("Shipping (your 25% share)", buyerShip));
        if (stripeFee > 0m) lineItems.Add(MoneyLine("Payment processing fee", stripeFee));

        var sessionOptions = new SessionCreateOptions
        {
            PaymentMethodTypes = new List<string> { "card" },
            Mode = "payment",
            LineItems = lineItems,
            SuccessUrl = $"{appUrl}/custom/request-view/{requestId}?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{appUrl}/custom/request-view/{requestId}?payment=canceled",
            Metadata = new Dictionary<string, string>
            {
                ["type"] = "offer",
                ["offerId"] = offerId.ToString(),
                ["milestone"] = milestone,
                ["amount"] = amount.ToString(CultureInfo.InvariantCulture),
                ["addressId"] = req.AddressId ?? "",
            },
        };

        var session = await new SessionService(new StripeClient(_stripe.SecretKey)).CreateAsync(sessionOptions);
        return new CheckoutResult { Url = session.Url, SessionId = session.Id, OrderId = "" };
    }

    // ===================== Confirmation =====================

    /// <summary>
    /// Server-side confirmation: retrieves the Stripe session, and if it is paid, applies the
    /// fulfillment exactly once. Used by the success-redirect so the demo never depends on a
    /// reachable webhook endpoint.
    /// </summary>
    public async Task<ConfirmCheckoutResult> ConfirmSessionAsync(string? sessionId)
    {
        if (!_stripe.IsConfigured)
            throw new AppException("Stripe not configured", 503, "SERVICE_UNAVAILABLE");
        if (string.IsNullOrWhiteSpace(sessionId))
            throw new ValidationAppException("Missing session id");

        var session = await new SessionService(new StripeClient(_stripe.SecretKey)).GetAsync(sessionId);
        var paid = string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase);

        var meta = session.Metadata ?? new Dictionary<string, string>();
        meta.TryGetValue("type", out var type);
        meta.TryGetValue("orderId", out var orderId);
        meta.TryGetValue("offerId", out var offerId);

        if (paid) await ApplyPaidSessionAsync(session);

        return new ConfirmCheckoutResult
        {
            Status = paid ? "paid" : session.PaymentStatus ?? "unpaid",
            Type = type ?? "order",
            OrderId = string.IsNullOrEmpty(orderId) ? null : orderId,
            OfferId = string.IsNullOrEmpty(offerId) ? null : offerId,
        };
    }

    /// <summary>
    /// Applies a paid Stripe session to the right domain object. Idempotent in both branches.
    /// Called by the webhook (<see cref="StripeWebhookService"/>) and by <see cref="ConfirmSessionAsync"/>.
    /// </summary>
    public async Task ApplyPaidSessionAsync(Session session, CancellationToken ct = default)
    {
        var meta = session.Metadata ?? new Dictionary<string, string>();
        meta.TryGetValue("type", out var type);

        if (type == "offer")
        {
            if (meta.TryGetValue("offerId", out var oid) && int.TryParse(oid, out var offerId))
            {
                meta.TryGetValue("milestone", out var milestone);
                meta.TryGetValue("amount", out var amountStr);
                decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount);
                int? addressId = meta.TryGetValue("addressId", out var aid) && int.TryParse(aid, out var a) ? a : null;
                await _offers.RecordPaidMilestoneAsync(offerId, string.IsNullOrWhiteSpace(milestone) ? "final" : milestone, amount, addressId);
            }
            return;
        }

        if (type == "promotion")
        {
            if (meta.TryGetValue("sellerId", out var sid) && int.TryParse(sid, out var sellerId)
                && meta.TryGetValue("productId", out var pid) && int.TryParse(pid, out var productId))
            {
                meta.TryGetValue("plan", out var plan);
                // PaymentRef = the Stripe payment-intent → idempotent across webhook + redirect confirm.
                await _promotions.ActivateAsync(sellerId, productId, plan, "STRIPE", session.PaymentIntentId);
            }
            return;
        }

        // Default: a standard order.
        if (meta.TryGetValue("orderId", out var orderIdStr) && int.TryParse(orderIdStr, out var orderId))
            await _fulfillment.MarkOrderPaidAndFulfillAsync(orderId, session.PaymentIntentId);
    }

    /// <summary>
    /// Cancels a still-unpaid order when the buyer backs out of the payment page. Only touches an
    /// order that belongs to the caller and is NOT yet paid (so it can never cancel a paid order or
    /// someone else's). Idempotent + safe to call from the cart's "payment canceled" return.
    /// </summary>
    public async Task<bool> CancelPendingOrderAsync(int personId, int orderId)
    {
        var enduserId = await _db.Endusers.AsNoTracking()
            .Where(e => e.Personid == personId).Select(e => (int?)e.Enduserid).FirstOrDefaultAsync();
        if (enduserId is null) return false;

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Orderid == orderId);
        if (order is null || order.Enduserid != enduserId || order.IsPaid == true)
            return false;

        await CancelOrphanedOrderAsync(orderId);
        return true;
    }

    private async Task CancelOrphanedOrderAsync(int orderId)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Orderid == orderId);
        if (order is not null)
        {
            order.Status = 5; // CANCELED
            await _db.StoreOrders
                .Where(so => so.Orderid == orderId)
                .ExecuteUpdateAsync(s => s.SetProperty(so => so.Status, "CANCELED"));
            await _db.SaveChangesAsync();
        }
    }
}
