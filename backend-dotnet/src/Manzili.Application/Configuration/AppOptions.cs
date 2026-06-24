namespace Manzili.Application.Configuration;

/// <summary>
/// Strongly-typed configuration mirroring the Node backend's src/config/env.js.
/// Bound from configuration section "Manzili" (appsettings / env / user-secrets).
/// </summary>
public sealed class AppOptions
{
    public const string SectionName = "Manzili";

    public JwtOptions Jwt { get; set; } = new();
    public CloudinaryOptions Cloudinary { get; set; } = new();
    public StripeOptions Stripe { get; set; } = new();
    public KashierOptions Kashier { get; set; } = new();
    public GoogleAuthOptions Google { get; set; } = new();
    public BostaOptions Bosta { get; set; } = new();
    public FeesOptions Fees { get; set; } = new();
    public EmailOptions Email { get; set; } = new();
    public EmbeddingsOptions Embeddings { get; set; } = new();

    /// <summary>Comma-separated list of allowed CORS origins. "*" allows any.</summary>
    public string CorsOrigin { get; set; } = "*";

    /// <summary>Public app URL used for building redirect/callback URLs (fallback when no trusted Origin).</summary>
    public string AppUrl { get; set; } = "http://localhost:3000";

    /// <summary>Shared secret gating privileged admin actions (legacy parity).</summary>
    public string? AdminActionsSecret { get; set; }

    /// <summary>
    /// Resolves the front-end base URL for payment redirect/return links. Prefers the request's
    /// <paramref name="origin"/> (so a checkout started on localhost returns to localhost, and one
    /// started on the Vercel site returns to Vercel) but ONLY when that origin is in the CORS
    /// allowlist — an untrusted/absent Origin falls back to <see cref="AppUrl"/>. This keeps an
    /// attacker from redirecting the post-payment URL (and its session id) to an arbitrary host.
    /// </summary>
    public string ResolveBaseUrl(string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin)) return AppUrl.TrimEnd('/');
        var o = origin.Trim().TrimEnd('/');
        foreach (var allowed in CorsOrigin.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (allowed == "*") return o; // wildcard CORS → trust the request origin
            if (string.Equals(allowed.TrimEnd('/'), o, StringComparison.OrdinalIgnoreCase)) return o;
        }
        return AppUrl.TrimEnd('/');
    }
}

public sealed class JwtOptions
{
    public string Secret { get; set; } = "";
    public string RefreshSecret { get; set; } = "";
    public string ExpiresIn { get; set; } = "15m";
    public string RefreshExpiresIn { get; set; } = "7d";
}

public sealed class CloudinaryOptions
{
    public string? CloudName { get; set; }
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public bool IsConfigured => !string.IsNullOrWhiteSpace(CloudName)
        && !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(ApiSecret);
}

/// <summary>
/// Transactional email (contact form + newsletter). Bind under "Manzili:Email". Works with any
/// SMTP provider — e.g. Gmail SMTP (smtp.gmail.com:587 + a Google App Password), SendGrid,
/// Mailgun, Amazon SES, Resend SMTP. Leave Enabled=false (the default) and sends become no-ops
/// so the forms still succeed in the demo.
/// </summary>
public sealed class EmailOptions
{
    public bool Enabled { get; set; }
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    public string? Password { get; set; }
    public string? FromAddress { get; set; }
    public string FromName { get; set; } = "Manzili";
    /// <summary>Inbox that receives contact-form messages + new-subscriber notices.</summary>
    public string? ContactRecipient { get; set; }

    public bool IsConfigured =>
        Enabled && !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(FromAddress);
}

public sealed class StripeOptions
{
    public string? SecretKey { get; set; }
    public string? WebhookSecret { get; set; }
    public string Currency { get; set; } = "egp";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);
}

/// <summary>
/// Kashier (Egyptian gateway) — Hosted Payment Page flow. The backend builds a signed HPP
/// redirect URL (no server pre-registration call); a server-to-server webhook plus the
/// redirect return both confirm payment, mirroring the Stripe slice.
/// </summary>
public sealed class KashierOptions
{
    /// <summary>Merchant id, e.g. MID-XXXX-XXXX.</summary>
    public string? MerchantId { get; set; }
    /// <summary>
    /// Payment API key — drives EVERYTHING in the HPP flow: the order hash, the redirect-return
    /// signature, and the webhook x-kashier-signature are all HMAC-SHA256'd with this key.
    /// </summary>
    public string? ApiKey { get; set; }
    /// <summary>
    /// Account secret key (server-to-server API auth — refunds, payment sessions). NOT used by the
    /// HPP redirect flow or its signatures; reserved for future server-side Kashier API calls.
    /// </summary>
    public string? SecretKey { get; set; }
    /// <summary>"test" or "live".</summary>
    public string Mode { get; set; } = "test";
    public string Currency { get; set; } = "EGP";
    /// <summary>Hosted Payment Page base, e.g. https://checkout.kashier.io/.</summary>
    public string BaseUrl { get; set; } = "https://checkout.kashier.io/";
    /// <summary>
    /// Publicly reachable URL of THIS API for the server-to-server callback, e.g. an ngrok
    /// tunnel "https://abc123.ngrok.io". When null, no serverWebhook param is sent and the
    /// redirect-confirm path alone completes the demo.
    /// </summary>
    public string? WebhookUrl { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(MerchantId) && !string.IsNullOrWhiteSpace(ApiKey);
}

/// <summary>
/// Google Sign-In (OAuth 2.0 / GIS). Only the public Client ID is needed server-side to verify
/// the ID token's audience; the secret is only required for the (unused) code-exchange flow.
/// </summary>
public sealed class GoogleAuthOptions
{
    public string? ClientId { get; set; }
    public string? ClientSecret { get; set; }
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId);
}

/// <summary>
/// Marketplace economics. Defaults encode the agreed model:
/// Manzili commission 15% (standard) / 10% (custom); Bosta delivery fee split
/// 75% seller / 25% buyer; Stripe processing fee borne by the buyer.
/// </summary>
public sealed class FeesOptions
{
    public decimal CommissionStandard { get; set; } = 0.15m;
    public decimal CommissionCustom { get; set; } = 0.10m;
    public decimal ShippingSellerShare { get; set; } = 0.65m;
    public decimal ShippingBuyerShare { get; set; } = 0.35m;
    /// <summary>Stripe percentage fee (e.g. 2.9%).</summary>
    public decimal StripeFeePercent { get; set; } = 0.029m;
    /// <summary>Stripe fixed fee per charge (in the store currency).</summary>
    public decimal StripeFeeFixed { get; set; } = 0m;
    /// <summary>Flat Bosta delivery fee per seller shipment (used until live Bosta rating is enabled).</summary>
    public decimal DefaultShipping { get; set; } = 50m;

    public decimal Commission(decimal amount, bool custom) =>
        Round(amount * (custom ? CommissionCustom : CommissionStandard));
    public decimal BuyerShip(decimal shipping) => Round(shipping * ShippingBuyerShare);
    public decimal SellerShip(decimal shipping) => Round(shipping * ShippingSellerShare);
    public decimal StripeFee(decimal baseAmount) => Round(baseAmount * StripeFeePercent + StripeFeeFixed);

    private static decimal Round(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}

/// <summary>
/// Semantic-search embeddings. Products + queries are embedded into vectors stored in pgvector
/// (manzili.products.embedding). Jina (v5-text-small) is the primary provider; Cohere (embed-v4)
/// is the standby. Both at 1024 dims, multilingual. The index is single-provider — if the primary
/// changes, the catalog is re-embedded. Leave keys blank to disable semantic search (falls back
/// to lexical search), so the app still runs without it.
/// </summary>
public sealed class EmbeddingsOptions
{
    public bool Enabled { get; set; } = true;
    public int Dimensions { get; set; } = 1024;
    public string? JinaApiKey { get; set; }
    public string JinaModel { get; set; } = "jina-embeddings-v5-text-small";
    public string? CohereApiKey { get; set; }
    public string CohereModel { get; set; } = "embed-v4.0";

    /// <summary>Hard ceiling on cosine distance (pgvector &lt;=&gt;, range [0,2]) for "describe-it"
    /// search: if even the CLOSEST product is beyond this, the query matches nothing. The result
    /// count is otherwise driven by a relative gap to the best match (see SemanticSearchService), so
    /// this only needs to be generous enough to admit valid-but-vague queries. Tunable via
    /// Manzili__Embeddings__MaxDistance without a code change.</summary>
    public double MaxDistance { get; set; } = 1.1;

    public bool IsConfigured => Enabled
        && (!string.IsNullOrWhiteSpace(JinaApiKey) || !string.IsNullOrWhiteSpace(CohereApiKey));
}

public sealed class BostaOptions
{
    public bool IntegrationEnabled { get; set; }
    public string BaseUrl { get; set; } = "https://app.bosta.co/api/v2/";
    public string? Authorization { get; set; }
    public string? ApiKey { get; set; }
    public string? AuthScheme { get; set; }
    public string? BusinessLocationId { get; set; }
    public string? WebhookBaseUrl { get; set; }
    public string? WebhookAuthHeaderName { get; set; }
    public string? WebhookAuthHeaderValue { get; set; }

    /// <summary>
    /// Resolves the Authorization header value, mirroring env.js:resolveBostaAuth().
    /// Prefers explicit Authorization, else ApiKey (optionally prefixed with AuthScheme).
    /// </summary>
    public string? ResolveAuthorization()
    {
        if (!string.IsNullOrWhiteSpace(Authorization)) return Authorization.Trim();
        if (string.IsNullOrWhiteSpace(ApiKey)) return null;
        return !string.IsNullOrWhiteSpace(AuthScheme) ? $"{AuthScheme.Trim()} {ApiKey.Trim()}" : ApiKey.Trim();
    }

    public string NormalizedBaseUrl => BaseUrl.EndsWith('/') ? BaseUrl : BaseUrl + "/";
}
