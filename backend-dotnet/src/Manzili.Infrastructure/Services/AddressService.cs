using Manzili.Application.Account;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/address.service.js.</summary>
public sealed class AddressService
{
    private readonly ManziliDbContext _db;

    public AddressService(ManziliDbContext db) => _db = db;

    // Mirrors Node mapAddress(): postalCode falls back from postalcode -> zipcode.
    private static AddressDto Map(Address a) => new()
    {
        Id = a.Id.ToString(),
        Name = a.Name ?? "",
        Phone = a.Phone ?? "",
        City = a.City ?? "",
        Zone = a.Zone ?? "",
        District = a.District ?? "",
        Street = a.Street ?? "",
        Building = a.Buildingnumber ?? "",
        Floor = a.Floor ?? "",
        Apartment = a.Apartmentnumber ?? "",
        PostalCode = a.Postalcode ?? a.Zipcode ?? "",
        BostaCityId = a.BostaCityId,
        BostaZoneId = a.BostaZoneId,
        BostaDistrictId = a.BostaDistrictId,
    };

    public async Task<List<AddressDto>> ListAddressesAsync(int personId)
    {
        var addresses = await _db.Addresses
            .AsNoTracking()
            .Where(a => a.Personid == personId)
            .ToListAsync();
        return addresses.Select(Map).ToList();
    }

    public async Task<AddressDto> CreateAddressAsync(int personId, CreateAddressRequest body)
    {
        var address = new Address
        {
            Personid = personId,
            Name = body.Name,
            Phone = body.Phone,
            City = body.City,
            Zone = body.Zone,
            District = body.District,
            Street = body.Street,
            Buildingnumber = body.Building,
            Floor = body.Floor,
            Apartmentnumber = body.Apartment,
            Postalcode = body.PostalCode,
            BostaCityId = body.BostaCityId,
            BostaZoneId = body.BostaZoneId,
            BostaDistrictId = body.BostaDistrictId,
        };

        _db.Addresses.Add(address);
        await _db.SaveChangesAsync();

        return Map(address);
    }

    public async Task DeleteAddressAsync(int personId, int addressId)
    {
        var address = await _db.Addresses.FirstOrDefaultAsync(a => a.Id == addressId)
            ?? throw new NotFoundException("Address");
        if (address.Personid != personId)
            throw new ForbiddenException("Not your address");

        _db.Addresses.Remove(address);
        await _db.SaveChangesAsync();
    }
}
