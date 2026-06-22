using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Authoritative server-to-server confirmation for Kashier. Verifies the <c>x-kashier-signature</c>
/// header, then on a SUCCESS transaction runs the idempotent
/// <see cref="FulfillmentService.MarkOrderPaidAndFulfillAsync"/> using <c>merchantOrderId</c>
/// (= Manzili order id). Mirrors <c>StripeWebhookService</c>.
///
/// Per Kashier's spec, the signature is built from the fields named in the payload's
/// <c>signatureKeys</c> array, ordered ALPHABETICALLY, joined as "k=v&amp;…", and HMAC-SHA256'd with
/// the <b>Payment API key</b> (the same key used to compute the HPP order hash — NOT the secret key).
/// </summary>
public sealed class KashierWebhookService
{
    private readonly FulfillmentService _fulfillment;
    private readonly KashierOptions _kashier;

    public KashierWebhookService(FulfillmentService fulfillment, IOptions<AppOptions> options)
    {
        _fulfillment = fulfillment;
        _kashier = options.Value.Kashier;
    }

    public bool IsConfigured => _kashier.IsConfigured;

    public async Task HandleAsync(string rawBody, string? signature, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_kashier.ApiKey))
            throw new AppException("Kashier not configured", 400, "INVALID_SIGNATURE");

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;
        // Payload is { event, data: { status, merchantOrderId, transactionId, signatureKeys[], ... } }.
        var data = root.TryGetProperty("data", out var d) && d.ValueKind == JsonValueKind.Object ? d : root;

        // Build the signature base: the signatureKeys fields, sorted alphabetically, as k=v&…
        var keys = new List<string>();
        if (data.TryGetProperty("signatureKeys", out var sk) && sk.ValueKind == JsonValueKind.Array)
            keys.AddRange(sk.EnumerateArray().Where(e => e.ValueKind == JsonValueKind.String).Select(e => e.GetString()!));

        var basePairs = keys
            .OrderBy(k => k, StringComparer.Ordinal)
            .Select(k => $"{k}={ValueToString(data, k)}");
        var expected = HmacSha256Hex(string.Join("&", basePairs), _kashier.ApiKey!);

        if (string.IsNullOrWhiteSpace(signature) ||
            !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(signature.Trim())))
        {
            throw new AppException("Invalid Kashier signature", 400, "INVALID_SIGNATURE");
        }

        var status = GetString(data, "status");
        var merchantOrderId = GetString(data, "merchantOrderId") ?? GetString(data, "orderId");
        var transactionId = GetString(data, "transactionId");

        if (string.Equals(status, "SUCCESS", StringComparison.OrdinalIgnoreCase) &&
            int.TryParse(merchantOrderId, out var orderId))
        {
            await _fulfillment.MarkOrderPaidAndFulfillAsync(orderId, transactionId);
        }
    }

    private static string? GetString(JsonElement el, string name) =>
        el.ValueKind == JsonValueKind.Object && el.TryGetProperty(name, out var v) ? ValueToString(v) : null;

    /// <summary>String form of a field for the signature base (string→raw, number→raw text, bool→lowercase).</summary>
    private static string ValueToString(JsonElement parent, string name) =>
        parent.TryGetProperty(name, out var v) ? ValueToString(v) : "";

    private static string ValueToString(JsonElement v) => v.ValueKind switch
    {
        JsonValueKind.String => v.GetString() ?? "",
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        JsonValueKind.Null or JsonValueKind.Undefined => "",
        _ => v.GetRawText(),
    };

    private static string HmacSha256Hex(string data, string key)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var bytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
