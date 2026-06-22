using Manzili.Application.Common;
using Manzili.Application.Custom;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of Node services/customRequest.service.js (buyer-facing custom requests).
/// Covers list / create / get / update / delete of a buyer's custom requests.
/// </summary>
public sealed class CustomRequestService
{
    private readonly ManziliDbContext _db;

    public CustomRequestService(ManziliDbContext db)
    {
        _db = db;
    }

    // ---------- Public API ----------

    /// <summary>List the signed-in buyer's requests, newest first (paginated).</summary>
    public async Task<(IReadOnlyList<CustomRequestListItemDto> Requests, int Total, int Page, int Limit)> ListBuyerRequestsAsync(
        int personId, int? page, int? limit)
    {
        var paging = Pagination.Parse(page, limit);

        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        if (enduser is null)
            return ([], 0, paging.Page, paging.Limit);

        var name = await OwnerNameAsync(personId);

        var query = _db.CustomRequests.AsNoTracking()
            .Where(r => r.Enduserid == enduser.Enduserid);

        var total = await query.CountAsync();

        var requests = await query
            .Include(r => r.Category)
            .OrderByDescending(r => r.CreatedAt)
            .Skip(paging.Skip)
            .Take(paging.Take)
            .ToListAsync();

        var items = requests.Select(r => new CustomRequestListItemDto
        {
            Id = r.Requestid.ToString(),
            Image = r.ImageUrls is { Count: > 0 } ? r.ImageUrls[0] : "",
            ItemName = r.Itemname,
            Category = r.Category?.CategoryName ?? "",
            Visibility = r.Visibility ? "open" : "private",
            CreatedAt = FormatDate(r.CreatedAt),
            User = new CustomUserDto { Id = personId.ToString(), Name = name },
        }).ToList();

        return (items, total, paging.Page, paging.Limit);
    }

    public async Task<CustomRequestDetailDto> CreateRequestAsync(int personId, CreateCustomRequestRequest body)
    {
        var enduser = await _db.Endusers.FirstOrDefaultAsync(e => e.Personid == personId)
            ?? throw new NotFoundException("User");

        short categoryid = 1;
        if (!string.IsNullOrWhiteSpace(body.Category))
        {
            var cat = await _db.Categories
                .FirstOrDefaultAsync(c => c.CategoryName.ToLower() == body.Category.ToLower());
            if (cat is null)
            {
                cat = new Category { CategoryName = body.Category };
                _db.Categories.Add(cat);
                await _db.SaveChangesAsync();
            }
            categoryid = cat.Categoryid;
        }

        // A targeted (private) request carries the seller's store id. Validate it
        // exists before insert — otherwise a stale/deleted id triggers an FK
        // violation that surfaces as an opaque 500. A clean 404 is far easier to
        // diagnose (and to handle on the client).
        var targetSellerId = ParseNullableInt(body.StoreId);
        if (targetSellerId is int sid && !await _db.Sellers.AnyAsync(s => s.Sellerid == sid))
        {
            throw new NotFoundException("Store");
        }

        var request = new CustomRequest
        {
            Enduserid = enduser.Enduserid,
            Itemname = body.ItemName ?? "",
            Description = body.Description ?? "",
            Visibility = body.Visibility != "private",
            Categoryid = categoryid,
            Quantity = (short)(body.Quantity ?? 1),
            Lenght = body.Size?.Length,
            Width = body.Size?.Width,
            Hight = body.Size?.Height,
            Matrial = string.IsNullOrWhiteSpace(body.Material) ? null : body.Material,
            DesiredDeliveryDate = ParseDateOnly(body.DeliveryDate),
            CreatedAt = DateOnly.FromDateTime(DateTime.UtcNow),
            ImageUrls = body.Images?.ToList() ?? [],
            VoicememoUrl = string.IsNullOrWhiteSpace(body.VoiceMemoUrl) ? null : body.VoiceMemoUrl,
            Sellerid = targetSellerId,
        };

        _db.CustomRequests.Add(request);
        await _db.SaveChangesAsync();

        return await MapDetailAsync(request.Requestid, personId);
    }

    public async Task<CustomRequestDetailDto> GetRequestByIdAsync(int personId, int requestId)
    {
        var request = await _db.CustomRequests.AsNoTracking()
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.Requestid == requestId)
            ?? throw new NotFoundException("Request");

        // Access: owner, targeted seller, or open visibility.
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        var seller = await _db.Sellers.AsNoTracking().FirstOrDefaultAsync(s => s.Personid == personId);
        var isOwner = enduser is not null && request.Enduserid == enduser.Enduserid;
        var isTargetedSeller = seller is not null && request.Sellerid == seller.Sellerid;
        var isOpen = request.Visibility;
        if (!isOwner && !isTargetedSeller && !isOpen)
            throw new ForbiddenException("Access denied");

        return await BuildDetailAsync(request);
    }

    public async Task<CustomRequestDetailDto> UpdateRequestAsync(int personId, int requestId, UpdateCustomRequestRequest body)
    {
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        var request = await _db.CustomRequests
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.Requestid == requestId)
            ?? throw new NotFoundException("Request");

        if (enduser is null || request.Enduserid != enduser.Enduserid)
            throw new ForbiddenException("Not your request");

        if (!string.IsNullOrEmpty(body.ItemName)) request.Itemname = body.ItemName;
        if (!string.IsNullOrEmpty(body.Description)) request.Description = body.Description;
        if (body.Visibility is not null) request.Visibility = body.Visibility != "private";

        await _db.SaveChangesAsync();

        return await BuildDetailAsync(request);
    }

    public async Task<string> DeleteRequestAsync(int personId, int requestId)
    {
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        var request = await _db.CustomRequests.FirstOrDefaultAsync(r => r.Requestid == requestId)
            ?? throw new NotFoundException("Request");

        if (enduser is null || request.Enduserid != enduser.Enduserid)
            throw new ForbiddenException("Not your request");

        _db.CustomRequests.Remove(request);
        await _db.SaveChangesAsync();
        return "Request deleted";
    }

    // ---------- Mapping helpers ----------

    private async Task<CustomRequestDetailDto> MapDetailAsync(int requestId, int personId)
    {
        var request = await _db.CustomRequests.AsNoTracking()
            .Include(r => r.Category)
            .FirstAsync(r => r.Requestid == requestId);
        return await BuildDetailAsync(request);
    }

    private async Task<CustomRequestDetailDto> BuildDetailAsync(CustomRequest r)
    {
        var ownerPersonId = await _db.Endusers.AsNoTracking()
            .Where(e => e.Enduserid == r.Enduserid)
            .Select(e => (int?)e.Personid)
            .FirstOrDefaultAsync();

        var ownerName = ownerPersonId is null ? "" : await OwnerNameAsync(ownerPersonId.Value);
        var ownerImage = ownerPersonId is null
            ? null
            : await _db.People.AsNoTracking()
                .Where(x => x.Personid == ownerPersonId.Value)
                .Select(x => x.ImageUrl)
                .FirstOrDefaultAsync();

        CustomStoreDto? store = null;
        if (r.Sellerid is int sid)
        {
            var sname = await _db.Sellers.AsNoTracking()
                .Where(s => s.Sellerid == sid)
                .Select(s => s.Storename)
                .FirstOrDefaultAsync();
            store = new CustomStoreDto { Id = sid.ToString(), Name = sname ?? "" };
        }

        var hasSize = r.Lenght is not null || r.Width is not null || r.Hight is not null;

        var createdAt = FormatDate(r.CreatedAt);

        return new CustomRequestDetailDto
        {
            Id = r.Requestid.ToString(),
            ItemName = r.Itemname,
            Description = r.Description,
            Category = r.Category?.CategoryName ?? "",
            Images = r.ImageUrls ?? [],
            VoiceMemo = r.VoicememoUrl,
            Quantity = r.Quantity ?? 1,
            Material = r.Matrial,
            Size = hasSize ? new CustomSizeDto { Length = r.Lenght, Width = r.Width, Height = r.Hight } : null,
            DeliveryDate = r.DesiredDeliveryDate is DateOnly d ? FormatDate(d) : null,
            Visibility = r.Visibility ? "open" : "private",
            Store = store,
            User = new CustomUserDto { Id = ownerPersonId?.ToString() ?? "", Name = ownerName, Image = ownerImage },
            CreatedAt = createdAt,
            // No dedicated updated_at column on custom_request; mirror createdAt.
            UpdatedAt = createdAt,
        };
    }

    private async Task<string> OwnerNameAsync(int personId)
    {
        var p = await _db.People.AsNoTracking()
            .Where(x => x.Personid == personId)
            .Select(x => new { x.FirstName, x.LastName })
            .FirstOrDefaultAsync();
        if (p is null) return "";
        return string.Join(" ", new[] { p.FirstName, p.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
    }

    // ---------- Parsing / formatting ----------

    private static int? ParseNullableInt(string? s) =>
        int.TryParse(s, out var v) ? v : null;

    private static DateOnly? ParseDateOnly(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        return DateTime.TryParse(s, out var dt) ? DateOnly.FromDateTime(dt) : null;
    }

    private static string FormatDate(DateOnly d) =>
        d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
}
