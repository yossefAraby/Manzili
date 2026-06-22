using System.Text.Json.Serialization;

namespace Manzili.Application.Account;

/// <summary>Body for POST /api/v1/users/me/addresses (frontend field names).</summary>
public sealed class CreateAddressRequest
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Zone { get; set; }
    public string? District { get; set; }
    public string? Street { get; set; }
    public string? Building { get; set; }
    public string? Floor { get; set; }
    public string? Apartment { get; set; }
    public string? PostalCode { get; set; }
    public string? BostaCityId { get; set; }
    public string? BostaZoneId { get; set; }
    public string? BostaDistrictId { get; set; }
}

/// <summary>Mapped address, mirrors Node mapAddress() in services/address.service.js.</summary>
public sealed class AddressDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string City { get; set; } = "";
    public string Zone { get; set; } = "";
    public string District { get; set; } = "";
    public string Street { get; set; } = "";
    public string Building { get; set; } = "";
    public string Floor { get; set; } = "";
    public string Apartment { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public string? BostaCityId { get; set; }
    public string? BostaZoneId { get; set; }
    public string? BostaDistrictId { get; set; }
}
