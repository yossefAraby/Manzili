using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Manzili.Application.Configuration;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>Outcome of a Bosta webhook, so the controller can mirror Node's status codes.</summary>
public enum BostaWebhookStatus
{
    Ok,
    Duplicate,
    Unauthorized,
    MissingTrackingNumber,
    ShipmentNotFound,
}

public readonly record struct BostaWebhookOutcome(BostaWebhookStatus Status);

/// <summary>
/// Port of Node routes/webhook.routes.js POST /bosta. Verifies the optional auth header,
/// locates the shipment by tracking number, dedupes by SHA-256(payload), logs a
/// shipment_event, and updates the shipment status_text.
/// </summary>
public sealed class BostaWebhookService
{
    private readonly ManziliDbContext _db;
    private readonly BostaOptions _options;
    private readonly FulfillmentService _fulfillment;

    public BostaWebhookService(ManziliDbContext db, IOptions<AppOptions> options, FulfillmentService fulfillment)
    {
        _db = db;
        _options = options.Value.Bosta;
        _fulfillment = fulfillment;
    }

    /// <summary>
    /// <paramref name="rawBody"/> is the raw request body. The configured auth header value
    /// is supplied via <paramref name="authHeaderValue"/> (looked up by the controller using
    /// BostaOptions.WebhookAuthHeaderName).
    /// </summary>
    public async Task<BostaWebhookOutcome> HandleAsync(
        string rawBody, string? authHeaderValue, CancellationToken ct = default)
    {
        // Verify webhook auth header if configured.
        if (!string.IsNullOrWhiteSpace(_options.WebhookAuthHeaderName) &&
            !string.IsNullOrWhiteSpace(_options.WebhookAuthHeaderValue))
        {
            if (authHeaderValue != _options.WebhookAuthHeaderValue)
                return new BostaWebhookOutcome(BostaWebhookStatus.Unauthorized);
        }

        using var doc = JsonDocument.Parse(string.IsNullOrEmpty(rawBody) ? "{}" : rawBody);
        var root = doc.RootElement;

        var trackingNumber = ReadString(root, "TrackingNumber") ?? ReadString(root, "trackingNumber");
        if (string.IsNullOrWhiteSpace(trackingNumber))
            return new BostaWebhookOutcome(BostaWebhookStatus.MissingTrackingNumber);

        var shipment = await _db.Shipments
            .FirstOrDefaultAsync(s => s.TrackingNumber == trackingNumber, ct);
        if (shipment is null)
            return new BostaWebhookOutcome(BostaWebhookStatus.ShipmentNotFound);

        // Dedup by payload hash. Node hashes JSON.stringify(payload) (compact). We re-serialize
        // the parsed body compactly to mirror that.
        var compact = JsonSerializer.Serialize(root);
        var hash = Sha256Hex(compact);

        var existing = await _db.ShipmentEvents
            .AnyAsync(e => e.Shipmentid == shipment.Shipmentid && e.PayloadHash == hash, ct);
        if (existing)
            return new BostaWebhookOutcome(BostaWebhookStatus.Duplicate);

        // Resolve event_type: payload.CurrentStatus?.state || payload.eventType || 'unknown'
        var currentState = ReadCurrentStatusState(root);
        var eventType = currentState ?? ReadString(root, "eventType") ?? "unknown";

        _db.ShipmentEvents.Add(new ShipmentEvent
        {
            Shipmentid = shipment.Shipmentid,
            EventType = eventType,
            PayloadHash = hash,
            RawPayload = compact,
            OccurredAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        });

        // Update shipment status: payload.CurrentStatus?.state || 'UNKNOWN'
        shipment.StatusText = currentState ?? "UNKNOWN";

        await _db.SaveChangesAsync(ct);

        // Drive the order lifecycle (status rollup, wallet release, notifications, review unlock)
        // from the carrier event when it maps to a known transition.
        var mapped = MapBostaStateToStatus(currentState);
        if (mapped is not null && shipment.StoreOrderid is int storeOrderId)
            await _fulfillment.TransitionStoreOrderStatusAsync(storeOrderId, mapped, actorSellerId: null);

        return new BostaWebhookOutcome(BostaWebhookStatus.Ok);
    }

    /// <summary>Maps a Bosta state string to our canonical store-order status, or null if not relevant.</summary>
    private static string? MapBostaStateToStatus(string? state)
    {
        if (string.IsNullOrWhiteSpace(state)) return null;
        var s = state.ToLowerInvariant();
        if (s.Contains("delivered")) return "DELIVERED";
        if (s.Contains("picked") || s.Contains("transit") || s.Contains("out for delivery") || s.Contains("on its way"))
            return "SHIPPED";
        if (s.Contains("cancel") || s.Contains("terminat")) return "CANCELED";
        return null;
    }

    private static string? ReadString(JsonElement obj, string name) =>
        obj.ValueKind == JsonValueKind.Object &&
        obj.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static string? ReadCurrentStatusState(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Object &&
            root.TryGetProperty("CurrentStatus", out var cs) &&
            cs.ValueKind == JsonValueKind.Object &&
            cs.TryGetProperty("state", out var st) &&
            st.ValueKind == JsonValueKind.String)
            return st.GetString();
        return null;
    }

    private static string Sha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
