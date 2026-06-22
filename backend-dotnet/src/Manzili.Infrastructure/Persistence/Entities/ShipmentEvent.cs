using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class ShipmentEvent
{
    public int EventId { get; set; }

    public int Shipmentid { get; set; }

    public string EventType { get; set; } = null!;

    public DateTime OccurredAt { get; set; }

    public string PayloadHash { get; set; } = null!;

    public string RawPayload { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual Shipment Shipment { get; set; } = null!;
}
