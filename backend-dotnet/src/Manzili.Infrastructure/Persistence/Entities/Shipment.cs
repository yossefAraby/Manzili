using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Shipment
{
    public int Shipmentid { get; set; }

    public string? Carrier { get; set; }

    public short? ShipmentStatus { get; set; }

    public DateTime? ShippedAtTime { get; set; }

    public DateOnly? DeliveredAtTime { get; set; }

    public string? TrackingNumber { get; set; }

    public int? StoreOrderid { get; set; }

    public string? BostaDeliveryId { get; set; }

    public string? AwbUrl { get; set; }

    public decimal? ShippingCost { get; set; }

    public decimal? CodAmount { get; set; }

    public string? Size { get; set; }

    public string? StatusText { get; set; }

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<ShipmentEvent> ShipmentEvents { get; set; } = new List<ShipmentEvent>();

    public virtual StoreOrder? StoreOrder { get; set; }
}
