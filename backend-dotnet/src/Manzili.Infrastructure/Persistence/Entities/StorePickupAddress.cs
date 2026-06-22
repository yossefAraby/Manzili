using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class StorePickupAddress
{
    public int PickupId { get; set; }

    public int Sellerid { get; set; }

    public string FirstLine { get; set; } = null!;

    public string City { get; set; } = null!;

    public string? BostaCityId { get; set; }

    public string? BostaZoneId { get; set; }

    public string? BostaDistrictId { get; set; }

    public string? Phone { get; set; }

    public string? ContactName { get; set; }

    /// <summary>Friendly name for the warehouse, e.g. "Main warehouse" / "Alexandria branch".</summary>
    public string? Label { get; set; }

    /// <summary>The warehouse Bosta collects from by default for this seller's orders.</summary>
    public bool IsDefault { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Seller Seller { get; set; } = null!;
}
