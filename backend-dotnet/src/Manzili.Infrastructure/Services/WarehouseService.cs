using Manzili.Application.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Seller "warehouses" = pickup locations. A seller can keep several; Bosta collects
/// each order from the seller's <b>default</b> warehouse. Mirrors the buyer address CRUD
/// (<see cref="AddressService"/>) but scoped to a seller and with a single default flag.
/// </summary>
public sealed class WarehouseService
{
    private readonly ManziliDbContext _db;

    public WarehouseService(ManziliDbContext db) => _db = db;

    // store_pickup_addresses.created_at is `timestamp without time zone` → Unspecified Kind
    // (same Postgres gotcha as coupons/reports; Kind=Utc throws on write).
    private static DateTime Now() => DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

    private static WarehouseDto Map(StorePickupAddress w) => new()
    {
        Id = w.PickupId.ToString(),
        Label = w.Label ?? "",
        FirstLine = w.FirstLine,
        City = w.City,
        Phone = w.Phone ?? "",
        ContactName = w.ContactName ?? "",
        BostaCityId = w.BostaCityId,
        BostaZoneId = w.BostaZoneId,
        BostaDistrictId = w.BostaDistrictId,
        IsDefault = w.IsDefault,
        CreatedAt = w.CreatedAt.ToString("o"),
    };

    public async Task<List<WarehouseDto>> ListAsync(int sellerId)
    {
        var rows = await _db.StorePickupAddresses
            .AsNoTracking()
            .Where(w => w.Sellerid == sellerId)
            .OrderByDescending(w => w.IsDefault)
            .ThenBy(w => w.PickupId)
            .ToListAsync();
        return rows.Select(Map).ToList();
    }

    public async Task<WarehouseDto> CreateAsync(int sellerId, SaveWarehouseRequest req)
    {
        Validate(req);

        var existingCount = await _db.StorePickupAddresses.CountAsync(w => w.Sellerid == sellerId);
        // First warehouse is always the default; otherwise honour the requested flag.
        var makeDefault = existingCount == 0 || req.IsDefault == true;

        if (makeDefault) await ClearDefaultsAsync(sellerId);

        var w = new StorePickupAddress
        {
            Sellerid = sellerId,
            Label = Clean(req.Label) ?? DefaultLabel(req, existingCount),
            FirstLine = req.FirstLine!.Trim(),
            City = req.City!.Trim(),
            Phone = Clean(req.Phone),
            ContactName = Clean(req.ContactName),
            BostaCityId = Clean(req.BostaCityId),
            BostaZoneId = Clean(req.BostaZoneId),
            BostaDistrictId = Clean(req.BostaDistrictId),
            IsDefault = makeDefault,
            CreatedAt = Now(),
        };
        _db.StorePickupAddresses.Add(w);
        await _db.SaveChangesAsync();
        return Map(w);
    }

    public async Task<WarehouseDto> UpdateAsync(int sellerId, int id, SaveWarehouseRequest req)
    {
        Validate(req);
        var w = await Owned(sellerId, id);

        w.Label = Clean(req.Label) ?? w.Label;
        w.FirstLine = req.FirstLine!.Trim();
        w.City = req.City!.Trim();
        w.Phone = Clean(req.Phone);
        w.ContactName = Clean(req.ContactName);
        w.BostaCityId = Clean(req.BostaCityId);
        w.BostaZoneId = Clean(req.BostaZoneId);
        w.BostaDistrictId = Clean(req.BostaDistrictId);
        w.UpdatedAt = Now();

        if (req.IsDefault == true && !w.IsDefault)
        {
            await ClearDefaultsAsync(sellerId);
            w.IsDefault = true;
        }

        await _db.SaveChangesAsync();
        return Map(w);
    }

    public async Task SetDefaultAsync(int sellerId, int id)
    {
        var w = await Owned(sellerId, id);
        if (!w.IsDefault)
        {
            await ClearDefaultsAsync(sellerId);
            w.IsDefault = true;
            w.UpdatedAt = Now();
            await _db.SaveChangesAsync();
        }
    }

    public async Task DeleteAsync(int sellerId, int id)
    {
        var w = await Owned(sellerId, id);
        var wasDefault = w.IsDefault;
        _db.StorePickupAddresses.Remove(w);
        await _db.SaveChangesAsync();

        // Keep exactly one default: promote the oldest survivor if we removed the default.
        if (wasDefault)
        {
            var next = await _db.StorePickupAddresses
                .Where(x => x.Sellerid == sellerId)
                .OrderBy(x => x.PickupId)
                .FirstOrDefaultAsync();
            if (next is not null)
            {
                next.IsDefault = true;
                next.UpdatedAt = Now();
                await _db.SaveChangesAsync();
            }
        }
    }

    private async Task<StorePickupAddress> Owned(int sellerId, int id)
    {
        var w = await _db.StorePickupAddresses.FirstOrDefaultAsync(x => x.PickupId == id)
            ?? throw new NotFoundException("Warehouse");
        if (w.Sellerid != sellerId) throw new ForbiddenException("Not your warehouse");
        return w;
    }

    private async Task ClearDefaultsAsync(int sellerId)
    {
        var defaults = await _db.StorePickupAddresses
            .Where(w => w.Sellerid == sellerId && w.IsDefault)
            .ToListAsync();
        foreach (var d in defaults) d.IsDefault = false;
    }

    private static void Validate(SaveWarehouseRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FirstLine))
            throw new ValidationAppException("A street / address line is required");
        if (string.IsNullOrWhiteSpace(req.City))
            throw new ValidationAppException("A city is required");
        if (string.IsNullOrWhiteSpace(req.BostaCityId) ||
            string.IsNullOrWhiteSpace(req.BostaZoneId) ||
            string.IsNullOrWhiteSpace(req.BostaDistrictId))
            throw new ValidationAppException("Pick a city, zone and district so Bosta can collect from here");
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string DefaultLabel(SaveWarehouseRequest req, int existingCount) =>
        existingCount == 0 ? "Main warehouse" : (Clean(req.City) ?? "Warehouse");
}
