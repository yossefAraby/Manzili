using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class BostaAddressMapping
{
    public int MappingId { get; set; }

    public string Country { get; set; } = null!;

    public string CityName { get; set; } = null!;

    public string? ZoneName { get; set; }

    public string? DistrictName { get; set; }

    public string? CityId { get; set; }

    public string? ZoneId { get; set; }

    public string? DistrictId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
