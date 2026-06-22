using System.Text.Json;
using Manzili.Application.Common;
using Manzili.Application.Orders;
using Manzili.Infrastructure.Persistence.Entities;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Maps a <see cref="Shipment"/> entity (with its <see cref="ShipmentEvent"/>s loaded) to the
/// <see cref="ShipmentDto"/> the buyer/seller order views render as a Bosta tracking timeline.
/// </summary>
public static class ShipmentMapper
{
    public static ShipmentDto Map(Shipment s)
    {
        var statusCode = (int)(s.ShipmentStatus ?? 6);
        var status = StatusMaps.ShipmentStatus.TryGetValue(statusCode, out var label) ? label : "UNKNOWN";

        var events = (s.ShipmentEvents ?? new List<ShipmentEvent>())
            .OrderBy(e => e.OccurredAt)
            .Select(e => new ShipmentEventDto
            {
                Type = e.EventType,
                Description = ReadMessage(e.RawPayload) ?? Humanize(e.EventType),
                OccurredAt = ToIso(e.OccurredAt),
            })
            .ToList();

        return new ShipmentDto
        {
            TrackingNumber = s.TrackingNumber,
            Carrier = s.Carrier ?? "BOSTA",
            Status = status,
            StatusText = s.StatusText,
            AwbUrl = s.AwbUrl,
            ShippingCost = s.ShippingCost.HasValue ? (double)s.ShippingCost.Value : null,
            CodAmount = s.CodAmount.HasValue ? (double)s.CodAmount.Value : null,
            ShippedAt = ToIso(s.ShippedAtTime),
            DeliveredAt = s.DeliveredAtTime is DateOnly d
                ? d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                : null,
            Events = events,
        };
    }

    /// <summary>Reads a friendly {"message":"..."} field from a stored event payload, if present.</summary>
    private static string? ReadMessage(string? rawPayload)
    {
        if (string.IsNullOrWhiteSpace(rawPayload)) return null;
        try
        {
            using var doc = JsonDocument.Parse(rawPayload);
            if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                doc.RootElement.TryGetProperty("message", out var m) &&
                m.ValueKind == JsonValueKind.String)
                return m.GetString();
        }
        catch (JsonException) { /* raw Bosta payload — fall back to the event type */ }
        return null;
    }

    private static string Humanize(string eventType) =>
        eventType.Replace('_', ' ').ToLowerInvariant() is { Length: > 0 } s
            ? char.ToUpperInvariant(s[0]) + s[1..]
            : eventType;

    private static string ToIso(DateTime? dt)
    {
        if (dt is null) return "";
        var value = dt.Value;
        if (value.Kind == DateTimeKind.Unspecified)
            value = DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
    }
}
