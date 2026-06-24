using Manzili.Application.Catalog;
using Manzili.Application.Common;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/store.service.js.</summary>
public sealed class StoreService
{
    private readonly ManziliDbContext _db;
    private readonly ProductService _products;
    private readonly EmbeddingService _embeddings;

    public StoreService(ManziliDbContext db, ProductService products, EmbeddingService embeddings)
    {
        _db = db;
        _products = products;
        _embeddings = embeddings;
    }

    public async Task<StoreDetailDto> GetStoreByIdAsync(string storeId)
    {
        if (!int.TryParse(storeId, out var id))
            throw new NotFoundException("Store");

        var seller = await _db.Sellers.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Sellerid == id)
            ?? throw new NotFoundException("Store");
        // A disabled/deleted/unapproved store must not render a public page.
        if (seller.IsActive != true || seller.StoreStatus != StatusMaps.StoreStatus.Approved)
            throw new NotFoundException("Store");

        return await BuildStoreDetailAsync(seller);
    }

    public async Task<StoreDetailDto> GetStoreByUsernameAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new NotFoundException("Store");

        // Match the username case-INsensitively (the storefront link lowercases the slug, but the
        // stored username keeps its original case → an exact match misses "Maryam" vs "maryam").
        // Fall back to a numeric store-id so /shop/{id} links also resolve.
        var key = username.Trim().ToLower();
        var seller = await _db.Sellers.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Username != null && s.Username.ToLower() == key);
        if (seller is null && int.TryParse(key, out var sellerId))
            seller = await _db.Sellers.AsNoTracking().FirstOrDefaultAsync(s => s.Sellerid == sellerId);
        if (seller is null)
            throw new NotFoundException("Store");
        if (seller.IsActive != true || seller.StoreStatus != StatusMaps.StoreStatus.Approved)
            throw new NotFoundException("Store");

        return await BuildStoreDetailAsync(seller);
    }

    /// <summary>
    /// Search APPROVED, active stores by store name or @username for the custom-order private-vendor
    /// picker. Sourced from the seller table directly, so it finds sellers even before they've listed
    /// any product (the old product-dedup approach missed them) and never returns a hidden store.
    /// </summary>
    public async Task<IReadOnlyList<StoreSearchItemDto>> SearchStoresAsync(string? q, int limit = 20)
    {
        var query = (q ?? "").Trim().ToLower();
        limit = Math.Clamp(limit, 1, 50);

        var approved = StatusMaps.StoreStatus.Approved;
        var baseQ = _db.Sellers.AsNoTracking()
            .Where(s => s.IsActive == true && s.StoreStatus == approved);

        // Empty query → just list active approved stores.
        if (query.Length == 0)
            return await baseQ.OrderBy(s => s.Storename).Take(limit).Select(MapItem).ToListAsync();

        // 1) SEMANTIC: stores that OWN products matching the query's MEANING (reuses the product
        //    pgvector embeddings — stores themselves aren't embedded). "candles", "cozy desk piece",
        //    etc. surface the artisans who actually make such things. Empty when embeddings are off.
        var semanticIds = await SemanticSellerIdsAsync(query, limit);

        // 2) LEXICAL (broadened): match store name / @username / description, OR a store that owns a
        //    product whose name or category contains the query. This is why "store not found" used to
        //    fire — the old search only matched name/username, missing what the store actually sells.
        var lexicalIds = await baseQ
            .Where(s =>
                (s.Storename != null && s.Storename.ToLower().Contains(query)) ||
                (s.Username != null && s.Username.ToLower().Contains(query)) ||
                (s.StoreDescription != null && s.StoreDescription.ToLower().Contains(query)) ||
                _db.Products.Any(p => p.Sellerid == s.Sellerid && p.IsDisabled != true &&
                    (p.Productname.ToLower().Contains(query) ||
                     (p.Category != null && p.Category.CategoryName.ToLower().Contains(query)))))
            .OrderBy(s => s.Storename)
            .Take(limit)
            .Select(s => s.Sellerid)
            .ToListAsync();

        // 3) Merge: semantic matches first (best meaning first), then lexical not already included.
        var orderedIds = new List<int>();
        var seen = new HashSet<int>();
        foreach (var id in semanticIds) if (seen.Add(id)) orderedIds.Add(id);
        foreach (var id in lexicalIds) if (seen.Add(id)) orderedIds.Add(id);
        orderedIds = orderedIds.Take(limit).ToList();
        if (orderedIds.Count == 0) return Array.Empty<StoreSearchItemDto>();

        // Load the matched sellers (re-checking active+approved) and return them in the merged order.
        var sellers = await _db.Sellers.AsNoTracking()
            .Where(s => orderedIds.Contains(s.Sellerid) && s.IsActive == true && s.StoreStatus == approved)
            .ToListAsync();
        var map = sellers.ToDictionary(s => s.Sellerid);
        return orderedIds.Where(map.ContainsKey).Select(id => MapItemFor(map[id])).ToList();
    }

    /// <summary>Seller ids whose products are the closest semantic matches to the query (best-first),
    /// reusing the product embeddings. Empty when embeddings aren't configured / the query embed fails.</summary>
    private async Task<IReadOnlyList<int>> SemanticSellerIdsAsync(string query, int limit)
    {
        if (!_embeddings.IsConfigured) return Array.Empty<int>();
        var qvec = await _embeddings.EmbedOneAsync(query, isQuery: true);
        if (qvec is null) return Array.Empty<int>();

        var literal = EmbeddingService.ToPgVector(qvec);
        var approved = StatusMaps.StoreStatus.Approved;
        var maxDistance = _embeddings.MaxDistance;
        return await _db.Database.SqlQuery<int>(
            $@"SELECT s.sellerid AS ""Value""
               FROM manzili.products p
               JOIN manzili.seller s ON s.sellerid = p.sellerid
               WHERE p.embedding IS NOT NULL AND p.is_disabled IS NOT TRUE
                 AND s.is_active = TRUE AND s.store_status = {approved}
                 AND (p.embedding <=> {literal}::vector) < {maxDistance}
               GROUP BY s.sellerid
               ORDER BY MIN(p.embedding <=> {literal}::vector)
               LIMIT {limit}").ToListAsync();
    }

    // EF projection (for IQueryable) + in-memory mapper (for loaded entities) — same shape.
    private static readonly System.Linq.Expressions.Expression<Func<Seller, StoreSearchItemDto>> MapItem =
        s => new StoreSearchItemDto
        {
            Id = s.Sellerid.ToString(),
            Name = s.Storename ?? "",
            Username = s.Username,
            Description = s.StoreDescription ?? "",
            Logo = s.LogoUrl,
        };

    private static StoreSearchItemDto MapItemFor(Seller s) => new()
    {
        Id = s.Sellerid.ToString(),
        Name = s.Storename ?? "",
        Username = s.Username,
        Description = s.StoreDescription ?? "",
        Logo = s.LogoUrl,
    };

    private async Task<StoreDetailDto> BuildStoreDetailAsync(Seller seller)
    {
        var id = seller.Sellerid;

        var totalProducts = await _db.Products.AsNoTracking()
            .CountAsync(p => p.Sellerid == id && p.IsDisabled != true);

        var ratings = await _db.ReviewingAndRatings.AsNoTracking()
            .Where(r => r.Product.Sellerid == id)
            .Select(r => r.Rating)
            .ToListAsync();

        var avg = ratings.Count > 0 ? ratings.Average() : 0;

        return new StoreDetailDto
        {
            Id = seller.Sellerid.ToString(),
            Name = seller.Storename ?? "",
            Logo = seller.LogoUrl,
            Description = seller.StoreDescription ?? "",
            Location = seller.AddressText ?? "",
            Email = seller.Email ?? "",
            Phone = seller.Phone ?? "",
            Rating = Math.Round(avg * 10) / 10,
            TotalProducts = totalProducts,
            TotalReviews = ratings.Count,
        };
    }

    /// <summary>
    /// A seller's COMPLETED custom pieces for the public "Custom Work" section: orders created
    /// from a custom offer (TransactionRef LIKE 'offer_%') whose store order is DELIVERED for this
    /// seller, paired with the buyer's review of the order's placeholder product when one exists.
    /// "Done" = the seller applied the delivery (store order DELIVERED) AND the buyer left a review;
    /// pieces without a review are still surfaced (delivered work) but with no rating/snippet.
    /// Image falls back to a placeholder when the request/product image is missing or an oversized
    /// base64 data: URL (which never fits the varchar(500) image columns).
    /// </summary>
    public async Task<IReadOnlyList<CustomWorkDto>> GetCustomWorkAsync(string storeId, int limit = 12)
    {
        if (!int.TryParse(storeId, out var id))
            return new List<CustomWorkDto>();

        // Delivered custom store orders for this seller, with their single placeholder product item.
        var rows = await _db.StoreOrders.AsNoTracking()
            .Where(so => so.Sellerid == id
                && so.Status == "DELIVERED"
                && so.Order.TransactionRef != null
                && so.Order.TransactionRef.StartsWith("offer_"))
            .OrderByDescending(so => so.UpdatedAt ?? so.CreatedAt)
            .Select(so => new
            {
                so.StoreOrderid,
                so.Orderid,
                CompletedAt = so.UpdatedAt ?? so.CreatedAt,
                Item = so.StoreOrderItems
                    .Select(i => new { i.Productid, i.ProductName, i.ProductImageUrl, ProductCover = i.Product.CoverUrl })
                    .FirstOrDefault(),
            })
            .Take(limit)
            .ToListAsync();

        if (rows.Count == 0) return new List<CustomWorkDto>();

        // The buyer's review is tied to the placeholder product (and the order it was left from).
        var productIds = rows.Where(r => r.Item != null).Select(r => r.Item!.Productid).Distinct().ToList();
        var orderIds = rows.Select(r => r.Orderid).Distinct().ToList();
        var reviews = await _db.ReviewingAndRatings.AsNoTracking()
            .Where(r => productIds.Contains(r.Productid))
            .Select(r => new { r.Productid, r.Orderid, r.Rating, r.Comment })
            .ToListAsync();

        return rows.Select(r =>
        {
            var pid = r.Item?.Productid;
            // Prefer the review left from this exact order; otherwise any review of the product.
            var review = pid is int p
                ? reviews.FirstOrDefault(rv => rv.Productid == p && rv.Orderid == r.Orderid)
                  ?? reviews.FirstOrDefault(rv => rv.Productid == p)
                : null;
            return new CustomWorkDto
            {
                Id = r.StoreOrderid.ToString(),
                ProductName = r.Item?.ProductName ?? "Custom piece",
                Image = SafeImageUrl(r.Item?.ProductImageUrl) ?? SafeImageUrl(r.Item?.ProductCover),
                Rating = review?.Rating ?? 0,
                ReviewText = review?.Comment ?? "",
                CompletedAt = r.CompletedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            };
        }).ToList();
    }

    /// <summary>
    /// Guards the public custom-work image: custom-request images are stored as base64 <c>data:</c>
    /// URLs that overflow varchar(500); never echo those — return null so the UI uses a placeholder.
    /// </summary>
    private static string? SafeImageUrl(string? url) =>
        string.IsNullOrWhiteSpace(url) || url.StartsWith("data:", StringComparison.OrdinalIgnoreCase) || url.Length > 500
            ? null
            : url;

    public async Task<PagedProducts<ProductCardDto>> GetStoreProductsAsync(
        string storeId, Pagination pg, int? userId)
    {
        if (!int.TryParse(storeId, out var id))
            return new PagedProducts<ProductCardDto> { Items = new List<ProductCardDto>(), Total = 0, Page = pg.Page, Limit = pg.Limit };

        var query = _db.Products.AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Seller)
            .Include(p => p.ProductImages)
            .Include(p => p.ReviewingAndRatings)
            .Where(p => p.Sellerid == id && p.IsDisabled != true)
            .OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync();
        var products = await query.Skip(pg.Skip).Take(pg.Take).ToListAsync();

        var wishlisted = await _products.GetWishlistedIdsAsync(userId);
        return new PagedProducts<ProductCardDto>
        {
            Items = products.Select(p => ProductService.MapCard(p, wishlisted)).ToList(),
            Total = total,
            Page = pg.Page,
            Limit = pg.Limit,
        };
    }

    public async Task<string> ApplyForStoreAsync(int personId, StoreApplyRequest body)
    {
        var existing = await _db.Sellers.AsNoTracking().AnyAsync(s => s.Personid == personId);
        if (existing) throw new ConflictException("Already have a store application");

        // Username powers /shop/{username} profile links; ensure it's unique so an
        // approved store actually resolves. The national-ID photo is stored for the
        // admin verification review board.
        var username = string.IsNullOrWhiteSpace(body.Username) ? null : body.Username.Trim();
        if (!string.IsNullOrWhiteSpace(username) &&
            await _db.Sellers.AsNoTracking().AnyAsync(s => s.Username == username))
        {
            username = $"{username}_{personId}";
        }

        var seller = new Seller
        {
            Personid = personId,
            Storename = body.Name,
            StoreDescription = body.Description,
            Email = body.Email,
            Phone = body.Phone,
            LogoUrl = body.Logo,
            AddressText = body.Address,
            Username = username,
            NationalIdImageUrl = string.IsNullOrWhiteSpace(body.NationalIdImage) ? null : body.NationalIdImage.Trim(),
            StoreStatus = "pending",
            IsActive = false,
        };
        _db.Sellers.Add(seller);
        await _db.SaveChangesAsync();

        // Seed the seller's first (default) warehouse from the structured address they
        // entered on the form, so Bosta has a real pickup location from day one.
        var p = body.Pickup;
        if (p is not null && !string.IsNullOrWhiteSpace(p.FirstLine) && !string.IsNullOrWhiteSpace(p.City))
        {
            _db.StorePickupAddresses.Add(new StorePickupAddress
            {
                Sellerid = seller.Sellerid,
                Label = "Main warehouse",
                FirstLine = p.FirstLine!.Trim(),
                City = p.City!.Trim(),
                Phone = string.IsNullOrWhiteSpace(p.Phone) ? body.Phone : p.Phone.Trim(),
                ContactName = string.IsNullOrWhiteSpace(p.ContactName) ? null : p.ContactName.Trim(),
                BostaCityId = string.IsNullOrWhiteSpace(p.BostaCityId) ? null : p.BostaCityId.Trim(),
                BostaZoneId = string.IsNullOrWhiteSpace(p.BostaZoneId) ? null : p.BostaZoneId.Trim(),
                BostaDistrictId = string.IsNullOrWhiteSpace(p.BostaDistrictId) ? null : p.BostaDistrictId.Trim(),
                IsDefault = true,
                // store_pickup_addresses.created_at is `timestamp without time zone`.
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
            });
            await _db.SaveChangesAsync();
        }

        return "Application submitted, pending admin review";
    }

    /// <summary>The current person's store-application status (for the seller-facing verification banner).</summary>
    public async Task<MyApplicationDto> GetMyApplicationAsync(int personId)
    {
        var seller = await _db.Sellers.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Personid == personId);
        if (seller is null) return new MyApplicationDto { HasApplication = false };

        return new MyApplicationDto
        {
            HasApplication = true,
            Status = string.IsNullOrWhiteSpace(seller.StoreStatus) ? StatusMaps.StoreStatus.Pending : seller.StoreStatus,
            IsActive = seller.IsActive ?? false,
            StoreId = seller.Sellerid.ToString(),
            Name = seller.Storename,
        };
    }
}
