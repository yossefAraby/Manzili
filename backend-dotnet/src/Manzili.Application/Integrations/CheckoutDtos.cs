namespace Manzili.Application.Integrations;

// ---- Requests ----

/// <summary>
/// Body for POST /api/v1/checkout. Mirrors Node routes/checkout.routes.js, which forwards
/// the body to order.service.createOrder (paymentMethod forced to STRIPE) and builds Stripe
/// line items from <c>items</c> (name/price/quantity).
/// </summary>
public sealed class CheckoutRequest
{
    public List<CheckoutItem> Items { get; set; } = new();

    public string? AddressId { get; set; }

    /// <summary>"STRIPE" (default) or "COD". The /checkout/quote uses it so a COD total omits the Stripe fee.</summary>
    public string? PaymentMethod { get; set; }

    /// <summary>Kashier sub-method for the /checkout/kashier endpoint: "wallet" (mobile wallet) or "fawry". Ignored elsewhere.</summary>
    public string? Method { get; set; }

    /// <summary>Optional coupon object. Stored verbatim as the order's coupon_snapshot.</summary>
    public CheckoutCoupon? Coupon { get; set; }
}

public sealed class CheckoutItem
{
    public string? ProductId { get; set; }

    public int Quantity { get; set; }

    /// <summary>Unit price (used for the Stripe line-item amount and as order fallback price).</summary>
    public decimal? Price { get; set; }

    /// <summary>Optional product name for the Stripe line item (falls back to "Product {productId}").</summary>
    public string? Name { get; set; }

    /// <summary>Selected variant options as {groupName: optionValue} (e.g. {"Size":"XL"}) so the
    /// server can add each option's price-delta surcharge to the charged unit price.</summary>
    public Dictionary<string, string>? Variant { get; set; }
}

public sealed class CheckoutCoupon
{
    public decimal? DiscountAmount { get; set; }

    [System.Text.Json.Serialization.JsonExtensionData]
    public Dictionary<string, System.Text.Json.JsonElement>? Extra { get; set; }
}

/// <summary>Body for POST /api/v1/custom/offers/{id}/checkout — Stripe portal for a custom-order milestone.</summary>
public sealed class OfferCheckoutRequest
{
    /// <summary>first | second | final (defaults to final).</summary>
    public string? Milestone { get; set; }
    public decimal Amount { get; set; }
    public string? AddressId { get; set; }
    /// <summary>Kashier sub-method for the /custom/offers/{id}/kashier endpoint: "wallet" or "fawry".</summary>
    public string? Method { get; set; }
}

/// <summary>
/// Body for POST /api/v1/custom/offers/{id}/kashier/confirm — server-trusted confirm of the Kashier
/// redirect for a custom-order milestone. <c>Query</c> is the raw return query string (for signature
/// verification); the milestone/amount/address identify what was paid (mirrors the Stripe metadata).
/// </summary>
public sealed class OfferKashierConfirmRequest
{
    public string? Query { get; set; }
    public string? Milestone { get; set; }
    public decimal Amount { get; set; }
    public string? AddressId { get; set; }
}

/// <summary>Body for POST /api/v1/checkout/cancel — buyer backed out of the payment page; cancel the unpaid order.</summary>
public sealed class CancelOrderRequest
{
    public int OrderId { get; set; }
}

/// <summary>Body for POST /api/v1/checkout/confirm — verifies a completed Stripe session server-side.</summary>
public sealed class ConfirmCheckoutRequest
{
    public string? SessionId { get; set; }
}

/// <summary>
/// Body for POST /api/v1/checkout/kashier/confirm. <c>Query</c> is the raw Kashier return query
/// string (e.g. window.location.search) — sent verbatim so the backend can verify the signature
/// over the params in their ORIGINAL order, exactly as Kashier signed them.
/// </summary>
public sealed class KashierConfirmRequest
{
    public string? Query { get; set; }
}

// ---- Response ----

/// <summary>Checkout session result: { url, sessionId, orderId }.</summary>
public sealed class CheckoutResult
{
    public string? Url { get; set; }
    public string SessionId { get; set; } = "";
    public string OrderId { get; set; } = "";
}

/// <summary>Result of confirming a Stripe session: payment status + what it paid for.</summary>
public sealed class ConfirmCheckoutResult
{
    public string Status { get; set; } = "unpaid";
    public string? Type { get; set; }
    public string? OrderId { get; set; }
    public string? OfferId { get; set; }
}

/// <summary>
/// Money breakdown for a cart (POST /checkout/quote) so the UI shows exactly what the backend
/// will charge. Buyer pays goods − discount + their 25% shipping share + the Stripe fee.
/// </summary>
public sealed class CheckoutBreakdown
{
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Shipping { get; set; }            // total Bosta delivery fee (all stores), point estimate
    public decimal ShippingLow { get; set; }         // low end of the size+distance shipping range
    public decimal ShippingHigh { get; set; }        // high end of the size+distance shipping range
    public decimal BuyerShippingShare { get; set; }  // 25% — added to the buyer's bill
    public decimal SellerShippingShare { get; set; } // 75% — debited from seller wallets
    public decimal StripeFee { get; set; }           // borne by the buyer
    public decimal Commission { get; set; }          // Manzili platform take (from sellers)
    public decimal Total { get; set; }               // what the buyer pays
    public decimal SellerNet { get; set; }           // sellers receive (subtotal − commission − 75% shipping)
    public int Stores { get; set; }
    public string Currency { get; set; } = "EGP";
}
