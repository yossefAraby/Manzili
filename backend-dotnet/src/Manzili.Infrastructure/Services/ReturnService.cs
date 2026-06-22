using Manzili.Application.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/return.service.js.</summary>
public sealed class ReturnService
{
    private readonly ManziliDbContext _db;

    public ReturnService(ManziliDbContext db) => _db = db;

    public async Task<IReadOnlyList<ReturnDto>> ListReturnsAsync(int sellerid)
    {
        var returns = await _db.Returns
            .AsNoTracking()
            .Where(r => r.StoreOrder != null && r.StoreOrder.Sellerid == sellerid)
            .Include(r => r.StoreOrder!).ThenInclude(so => so.StoreOrderItems)
            .Include(r => r.StoreOrder!).ThenInclude(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .OrderByDescending(r => r.Requestdate)
            .ToListAsync();

        return returns.Select(r => new ReturnDto
        {
            Id = r.Returnid.ToString(),
            Reason = r.Reason,
            Status = r.Status,
            RefundAmount = r.RefundAmount.HasValue ? (double)r.RefundAmount.Value : null,
            CreatedAt = ToIso(r.Requestdate)!,
            Items = r.StoreOrder?.StoreOrderItems
                .Select(i => new OrderItemDto { Name = i.ProductName, Quantity = i.Quantity })
                .ToList() ?? [],
            Shipment = r.StoreOrder?.Shipment is null ? null : ShipmentMapper.Map(r.StoreOrder.Shipment),
        }).ToList();
    }

    public async Task<ProcessReturnResult> ProcessReturnAsync(int sellerid, int storeOrderId, ProcessReturnRequest body)
    {
        var so = await _db.StoreOrders.FirstOrDefaultAsync(o => o.StoreOrderid == storeOrderId)
            ?? throw new NotFoundException("Store order");
        if (so.Sellerid != sellerid) throw new ForbiddenException("Not your order");

        so.Status = "RETURNED";

        var returnRecord = new Return
        {
            Orderid = so.Orderid,
            StoreOrderid = storeOrderId,
            Reason = string.IsNullOrEmpty(body.Reason) ? "Return requested" : body.Reason,
            Status = 0,
            RefundAmount = so.Total,
            Requestdate = DateTime.UtcNow,
        };
        _db.Returns.Add(returnRecord);
        await _db.SaveChangesAsync();

        return new ProcessReturnResult
        {
            Id = returnRecord.Returnid.ToString(),
            StoreOrderId = storeOrderId.ToString(),
            RefundAmount = (double)so.Total,
        };
    }

    private static string? ToIso(DateTime? dt)
    {
        if (dt is null) return null;
        var value = dt.Value;
        if (value.Kind == DateTimeKind.Unspecified)
            value = DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
    }
}
