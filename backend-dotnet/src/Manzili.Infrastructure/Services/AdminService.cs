using Manzili.Application.Admin;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/admin.service.js.</summary>
public sealed class AdminService
{
    private readonly ManziliDbContext _db;
    private readonly NotificationService _notify;
    private readonly FulfillmentService _fulfillment;
    private readonly FeesOptions _fees;

    public AdminService(ManziliDbContext db, NotificationService notify, FulfillmentService fulfillment, IOptions<AppOptions> options)
    {
        _db = db;
        _notify = notify;
        _fulfillment = fulfillment;
        _fees = options.Value.Fees;
    }

    /// <summary>
    /// Manzili's own commission earnings (full administrators only — NOT moderators). The platform
    /// takes 15% of each standard sale and 10% of each custom-order sale; this sums that take across
    /// all PAID store orders so admins see their real revenue. Custom orders are the offer-derived
    /// ones (parent Order.TransactionRef starts with "offer_").
    /// </summary>
    public async Task<AdminRevenueDto> GetPlatformRevenueAsync(int callerPersonId)
    {
        await EnsureSuperAdminAsync(callerPersonId); // gated: admins only, never moderators

        var rows = await (
            from so in _db.StoreOrders.AsNoTracking().Where(so => so.IsPaid)
            join o in _db.Orders.AsNoTracking() on so.Orderid equals o.Orderid into og
            from o in og.DefaultIfEmpty()
            select new
            {
                Subtotal = (decimal?)so.Subtotal ?? 0m,
                IsCustom = o != null && o.TransactionRef != null && o.TransactionRef.StartsWith("offer_"),
            }).ToListAsync();

        decimal standardSales = 0m, customSales = 0m, standardCommission = 0m, customCommission = 0m;
        foreach (var r in rows)
        {
            if (r.IsCustom) { customSales += r.Subtotal; customCommission += _fees.Commission(r.Subtotal, custom: true); }
            else { standardSales += r.Subtotal; standardCommission += _fees.Commission(r.Subtotal, custom: false); }
        }

        return new AdminRevenueDto
        {
            PlatformRevenue = (double)(standardCommission + customCommission),
            StandardCommission = (double)standardCommission,
            CustomCommission = (double)customCommission,
            StandardSales = (double)standardSales,
            CustomSales = (double)customSales,
            GrossSales = (double)(standardSales + customSales),
            StandardRatePercent = (double)(_fees.CommissionStandard * 100m),
            CustomRatePercent = (double)(_fees.CommissionCustom * 100m),
        };
    }

    /// <summary>
    /// Admin override of a store order's status. Sellers can only confirm pickup and Bosta drives
    /// the rest via webhooks — but on a dev box Bosta can't reach localhost, so an admin can force a
    /// transition (e.g. mark SHIPPED/DELIVERED) to complete the flow. actorSellerId=null bypasses the
    /// ownership + seller whitelist.
    /// </summary>
    public async Task<AdminStoreActionResult> ForceOrderStatusAsync(int callerPersonId, string? storeOrderId, string? status)
    {
        await EnsureSectionAsync(callerPersonId, "orders");
        if (!int.TryParse(storeOrderId, out var id))
            throw new NotFoundException("Order");
        if (string.IsNullOrWhiteSpace(status))
            throw new ValidationAppException("status is required");

        var newStatus = await _fulfillment.TransitionStoreOrderStatusAsync(id, status, actorSellerId: null);
        return new AdminStoreActionResult { Id = id.ToString(), Status = newStatus };
    }

    // ===================== Returns approval =====================

    /// <summary>Lists returns awaiting admin review (PENDING_APPROVAL), newest first.</summary>
    public async Task<IReadOnlyList<AdminReturnDto>> ListPendingReturnsAsync(int callerPersonId)
    {
        await EnsureSectionAsync(callerPersonId, "orders");

        var rows = await _db.Returns.AsNoTracking()
            .Where(r => r.Status == StatusMaps.ReturnStatusCode.PendingApproval)
            .Include(r => r.StoreOrder!).ThenInclude(so => so.Seller)
            .Include(r => r.StoreOrder!).ThenInclude(so => so.StoreOrderItems)
            .Include(r => r.Order).ThenInclude(o => o!.Enduser).ThenInclude(e => e!.Person)
            .OrderByDescending(r => r.Requestdate)
            .ToListAsync();

        return rows.Select(r => new AdminReturnDto
        {
            Id = r.Returnid.ToString(),
            StoreOrderId = r.StoreOrderid?.ToString() ?? "",
            StoreName = r.StoreOrder?.Seller?.Storename ?? "",
            CustomerName = FullName(r.Order?.Enduser?.Person?.FirstName, r.Order?.Enduser?.Person?.LastName),
            Reason = r.Reason,
            Status = StatusMaps.ReturnStatus.TryGetValue(r.Status ?? 0, out var s) ? s : "PENDING_APPROVAL",
            RefundAmount = r.RefundAmount.HasValue ? (double)r.RefundAmount.Value : null,
            Items = r.StoreOrder?.StoreOrderItems
                .Select(i => new AdminOrderItemDto { Name = i.ProductName, Quantity = i.Quantity })
                .ToList() ?? [],
            CreatedAt = r.Requestdate.ToUniversalTime().ToString("o"),
        }).ToList();
    }

    /// <summary>
    /// Approves a return: runs the existing reverse-logistics (Bosta) + refund + seller wallet
    /// reversal path via the fulfillment service. Gated to the "orders" section.
    /// </summary>
    public async Task<AdminReturnActionResult> ApproveReturnAsync(int callerPersonId, string? returnId)
    {
        await EnsureSectionAsync(callerPersonId, "orders");
        if (!int.TryParse(returnId, out var id)) throw new NotFoundException("Return");

        var (rid, status, refund, tracking) = await _fulfillment.ApproveReturnAsync(id);
        return new AdminReturnActionResult
        {
            Id = rid.ToString(),
            Status = status,
            RefundAmount = (double)refund,
            TrackingNumber = string.IsNullOrEmpty(tracking) ? null : tracking,
        };
    }

    /// <summary>Rejects a return: marks it REJECTED, no refund/pickup/wallet reversal.</summary>
    public async Task<AdminReturnActionResult> RejectReturnAsync(int callerPersonId, string? returnId, string? note)
    {
        await EnsureSectionAsync(callerPersonId, "orders");
        if (!int.TryParse(returnId, out var id)) throw new NotFoundException("Return");

        var (rid, status) = await _fulfillment.RejectReturnAsync(id, note);
        return new AdminReturnActionResult { Id = rid.ToString(), Status = status };
    }

    public async Task<AdminStatsDto> GetStatsAsync()
    {
        var stores = await _db.Sellers.AsNoTracking().CountAsync();
        var products = await _db.Products.AsNoTracking().CountAsync(p => p.IsDisabled != true);
        var orders = await _db.StoreOrders.AsNoTracking().CountAsync();
        var pendingReports = await _db.Reports.AsNoTracking().CountAsync(r => r.Status == "PENDING");

        var revenue = await _db.StoreOrders.AsNoTracking()
            .Where(so => so.IsPaid)
            .SumAsync(so => (decimal?)so.Total) ?? 0m;

        return new AdminStatsDto
        {
            Stores = stores,
            Products = products,
            Orders = orders,
            PendingReports = pendingReports,
            Revenue = (double)revenue,
        };
    }

    public async Task<AdminPaged<AdminOrderDto>> ListOrdersAsync(Pagination pg)
    {
        var total = await _db.StoreOrders.AsNoTracking().CountAsync();

        var rows = await _db.StoreOrders.AsNoTracking()
            .Include(so => so.Seller)
            .Include(so => so.StoreOrderItems)
            .Include(so => so.Order)
                .ThenInclude(o => o!.Enduser)
                    .ThenInclude(e => e!.Person)
            .OrderByDescending(so => so.CreatedAt)
            .Skip(pg.Skip)
            .Take(pg.Take)
            .ToListAsync();

        var orders = rows.Select(so => new AdminOrderDto
        {
            Id = so.StoreOrderid.ToString(),
            StoreName = so.Seller?.Storename ?? "",
            CustomerName = FullName(so.Order?.Enduser?.Person?.FirstName, so.Order?.Enduser?.Person?.LastName),
            Items = so.StoreOrderItems.Select(i => new AdminOrderItemDto
            {
                Name = i.ProductName,
                Quantity = i.Quantity,
            }).ToList(),
            Total = (double)so.Total,
            Status = so.Status,
            CreatedAt = so.CreatedAt.ToUniversalTime().ToString("o"),
        }).ToList();

        return new AdminPaged<AdminOrderDto> { Items = orders, Total = total };
    }

    public async Task<AdminPaged<AdminProductDto>> ListProductsAsync(Pagination pg)
    {
        var total = await _db.Products.AsNoTracking().CountAsync();

        var rows = await _db.Products.AsNoTracking()
            .Include(p => p.Seller)
            .Include(p => p.Category)
            .OrderByDescending(p => p.CreatedAt)
            .Skip(pg.Skip)
            .Take(pg.Take)
            .ToListAsync();

        var products = rows.Select(p => new AdminProductDto
        {
            Id = p.Productid.ToString(),
            Name = p.Productname,
            Price = (double)(p.Price ?? 0m),
            Category = p.Category?.CategoryName ?? "",
            StoreName = p.Seller?.Storename ?? "",
            InStock = p.InStock ?? true,
            IsDisabled = p.IsDisabled ?? false,
        }).ToList();

        return new AdminPaged<AdminProductDto> { Items = products, Total = total };
    }

    public async Task<IReadOnlyList<AdminStoreDto>> ListStoresAsync(string? status)
    {
        var query = _db.Sellers.AsNoTracking().Include(s => s.Person).AsQueryable();
        if (!string.IsNullOrEmpty(status))
            query = query.Where(s => s.StoreStatus == status);

        var sellers = await query
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return sellers.Select(s => new AdminStoreDto
        {
            Id = s.Sellerid.ToString(),
            Name = s.Storename ?? "",
            Username = s.Username,
            Logo = s.LogoUrl,
            Email = s.Email,
            Contact = s.Phone,
            Address = s.AddressText,
            NationalIdImage = s.NationalIdImageUrl,
            OwnerName = FullName(s.Person.FirstName, s.Person.LastName),
            OwnerEmail = s.Person.Email,
            Status = s.StoreStatus ?? "pending",
            IsActive = s.IsActive ?? false,
            CreatedAt = s.CreatedAt?.ToUniversalTime().ToString("o"),
        }).ToList();
    }

    public async Task<AdminStoreActionResult> UpdateStoreStatusAsync(string? storeId, AdminStoreActionRequest body)
    {
        if (!int.TryParse(storeId, out var id))
            throw new NotFoundException("Store");

        var seller = await _db.Sellers.FirstOrDefaultAsync(s => s.Sellerid == id)
            ?? throw new NotFoundException("Store");

        switch (body.Action)
        {
            case "approve":
                seller.StoreStatus = StatusMaps.StoreStatus.Approved;
                seller.IsActive = true;
                break;
            case "reject":
                seller.StoreStatus = StatusMaps.StoreStatus.Rejected;
                seller.IsActive = false;
                break;
            case "disable":
                seller.IsActive = false;
                break;
            case "enable":
                seller.IsActive = true;
                break;
            case "delete":
                // Soft-delete: deactivate and mark status (hard delete would violate FK
                // relations to products/orders/coupons).
                seller.IsActive = false;
                seller.StoreStatus = "deleted";
                break;
        }

        await _db.SaveChangesAsync();

        // Let the applicant know the verification outcome (the notification is keyed to their
        // person, so they see it whether logged in as a buyer (pending) or seller (approved)).
        var storeName = string.IsNullOrWhiteSpace(seller.Storename) ? "your store" : $"\"{seller.Storename}\"";
        switch (body.Action)
        {
            case "approve":
                await _notify.CreateAsync(seller.Personid, "Your store is verified 🎉",
                    $"Great news — {storeName} passed verification. Please log in again to open your seller dashboard and start listing.",
                    "store", "/store");
                break;
            case "reject":
                await _notify.CreateAsync(seller.Personid, "Store application update",
                    $"We couldn't approve {storeName} this time. Reach out to manziliproject@gmail.com if you'd like to know more or re-apply.",
                    "store", "/create-store");
                break;
            case "disable":
                await _notify.CreateAsync(seller.Personid, "Your store was disabled",
                    $"{storeName} has been temporarily disabled by the Manzili team. Contact support for details.",
                    "store", "/store");
                break;
            case "enable":
                await _notify.CreateAsync(seller.Personid, "Your store is active again",
                    $"{storeName} is back online. Log in again if your dashboard access hasn't refreshed.",
                    "store", "/store");
                break;
        }

        return new AdminStoreActionResult
        {
            Id = id.ToString(),
            Status = seller.StoreStatus,
            IsActive = seller.IsActive,
        };
    }

    public async Task<AdminProductActionResult> UpdateProductAsync(AdminProductActionRequest body)
    {
        if (!int.TryParse(body.ProductId, out var id))
            throw new NotFoundException("Product");

        var product = await _db.Products.FirstOrDefaultAsync(p => p.Productid == id)
            ?? throw new NotFoundException("Product");

        string message;
        switch (body.Action)
        {
            case "disable":
                product.IsDisabled = true;
                message = "Product disabled";
                break;
            case "enable":
                product.IsDisabled = false;
                message = "Product enabled";
                break;
            case "delete":
                // Soft-delete (prefer over hard delete to keep order history intact).
                product.IsDisabled = true;
                message = "Product deleted";
                break;
            default:
                throw new ValidationAppException(new[]
                {
                    new { path = "action", message = "action must be one of: disable, enable, delete" }
                });
        }

        await _db.SaveChangesAsync();

        return new AdminProductActionResult { Success = true, Message = message };
    }

    /// <summary>
    /// PERMANENTLY deletes a product and all its dependent rows (variants/options, images, ratings,
    /// cart/wishlist/coupon links, order-item snapshots). Restricted to FULL administrators — a
    /// moderator can only soft-disable. Use sparingly; soft-delete (IsDisabled) is the default.
    /// </summary>
    public async Task<AdminProductActionResult> PurgeProductAsync(int callerPersonId, string? productId)
    {
        await EnsureSuperAdminAsync(callerPersonId); // full admins only — never moderators

        if (!int.TryParse(productId, out var id))
            throw new NotFoundException("Product");
        var name = await _db.Products.AsNoTracking()
            .Where(p => p.Productid == id).Select(p => p.Productname).FirstOrDefaultAsync()
            ?? throw new NotFoundException("Product");

        await using var tx = await _db.Database.BeginTransactionAsync();
        // Variant options (grandchildren) then variants — via EF navigations (no raw column names).
        await _db.VariantOptions.Where(o => o.Variant.Productid == id).ExecuteDeleteAsync();
        await _db.ProductVariants.Where(v => v.Productid == id).ExecuteDeleteAsync();
        // Direct child tables (table + productid column verified against the live schema).
        foreach (var tbl in new[]
                 {
                     "cart_contain", "consist_of", "coupon_product", "product_images",
                     "reviewing_and_rating", "whishlist_contain", "store_order_items",
                 })
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM manzili.{tbl} WHERE productid = {{0}}", id);
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM manzili.products WHERE productid = {0}", id);
        await tx.CommitAsync();

        return new AdminProductActionResult { Success = true, Message = $"\"{name}\" permanently deleted" };
    }

    /// <summary>
    /// DANGER ZONE: permanently deletes the ENTIRE product catalog plus all custom-order items
    /// (requests / offers / milestone payments) and everything that hangs off them (variants,
    /// images, cart &amp; wishlist links, coupon links, reviews, order-item snapshots). Users, the
    /// order shells, and Manzili's core reference data (categories, colours, Bosta mappings) are
    /// kept. Full administrators only. Runs in one transaction — any FK problem rolls the whole
    /// thing back, so it never leaves a half-wiped catalog.
    /// </summary>
    public async Task<AdminActionResult> PurgeAllItemsAsync(int callerPersonId)
    {
        await EnsureSuperAdminAsync(callerPersonId); // full admins only — never moderators

        await using var tx = await _db.Database.BeginTransactionAsync();

        // Catalog: grandchildren → children → parent.
        await _db.VariantOptions.ExecuteDeleteAsync();
        await _db.ProductVariants.ExecuteDeleteAsync();
        await _db.ProductImages.ExecuteDeleteAsync();
        await _db.CartContains.ExecuteDeleteAsync();
        await _db.ConsistOfs.ExecuteDeleteAsync();
        await _db.CouponProducts.ExecuteDeleteAsync();
        await _db.ReviewingAndRatings.ExecuteDeleteAsync();
        await _db.StoreOrderItems.ExecuteDeleteAsync();
        await _db.Wishlists.ExecuteDeleteAsync();
        await _db.Products.ExecuteDeleteAsync();

        // Custom items: children → parent.
        await _db.OfferPayments.ExecuteDeleteAsync();
        await _db.OfferMessages.ExecuteDeleteAsync();
        await _db.CustomizedOrders.ExecuteDeleteAsync();
        await _db.Offers.ExecuteDeleteAsync();
        await _db.ProofAsImages.ExecuteDeleteAsync();
        await _db.VisualInspirations.ExecuteDeleteAsync();
        await _db.Voicememos.ExecuteDeleteAsync();
        await _db.CustomRequests.ExecuteDeleteAsync();

        await tx.CommitAsync();
        return new AdminActionResult { Success = true, Message = "All products and custom items deleted" };
    }

    /// <summary>
    /// DANGER ZONE: permanently deletes ALL non-admin users (buyers + sellers) and everything they
    /// own — orders, shipments, returns, wallets, payouts, custom requests/offers, coupons,
    /// addresses, carts, wishlists, follows, notifications, reports, conversations, stores' products
    /// and warehouses. System administrators are preserved (and are re-seeded on startup anyway).
    /// Manzili's core reference data (categories, colours, Bosta mappings) is kept. Full admins only.
    /// One transaction — any FK problem rolls everything back.
    /// </summary>
    public async Task<AdminActionResult> PurgeAllUsersAsync(int callerPersonId)
    {
        await EnsureSuperAdminAsync(callerPersonId); // full admins only — never moderators

        await using var tx = await _db.Database.BeginTransactionAsync();

        // Catalog + product-linked rows (children → parent), so products can be removed below.
        await _db.VariantOptions.ExecuteDeleteAsync();
        await _db.ProductVariants.ExecuteDeleteAsync();
        await _db.ProductImages.ExecuteDeleteAsync();
        await _db.CartContains.ExecuteDeleteAsync();
        await _db.ConsistOfs.ExecuteDeleteAsync();
        await _db.CouponProducts.ExecuteDeleteAsync();
        await _db.ReviewingAndRatings.ExecuteDeleteAsync();
        await _db.StoreOrderItems.ExecuteDeleteAsync();
        await _db.Wishlists.ExecuteDeleteAsync();

        // Custom items.
        await _db.OfferPayments.ExecuteDeleteAsync();
        await _db.OfferMessages.ExecuteDeleteAsync();
        await _db.CustomizedOrders.ExecuteDeleteAsync();
        await _db.Offers.ExecuteDeleteAsync();
        await _db.ProofAsImages.ExecuteDeleteAsync();
        await _db.VisualInspirations.ExecuteDeleteAsync();
        await _db.Voicememos.ExecuteDeleteAsync();
        await _db.CustomRequests.ExecuteDeleteAsync();

        // Chat + moderation.
        await _db.Messages.ExecuteDeleteAsync();
        await _db.Conversations.ExecuteDeleteAsync();
        await _db.Reports.ExecuteDeleteAsync();

        // Fulfillment / shipping.
        await _db.ShipmentEvents.ExecuteDeleteAsync();
        await _db.Shipments.ExecuteDeleteAsync();
        await _db.Returns.ExecuteDeleteAsync();

        // Orders (store orders → standard orders → orders).
        await _db.StoreOrders.ExecuteDeleteAsync();
        await _db.StandardOrders.ExecuteDeleteAsync();
        await _db.Orders.ExecuteDeleteAsync();

        // Catalog parent (now unreferenced).
        await _db.Products.ExecuteDeleteAsync();

        // Wallets, payouts, coupons.
        await _db.WalletTransactions.ExecuteDeleteAsync();
        await _db.Payouts.ExecuteDeleteAsync();
        await _db.SellerWallets.ExecuteDeleteAsync();
        await _db.UserCoupons.ExecuteDeleteAsync();
        await _db.Coupons.ExecuteDeleteAsync();

        // Person-owned misc + addresses + warehouses.
        await _db.Notifications.ExecuteDeleteAsync();
        await _db.Follows.ExecuteDeleteAsync();
        await _db.Carts.ExecuteDeleteAsync();
        await _db.AddressesAndContactPhonenumbers.ExecuteDeleteAsync();
        await _db.Addresses.ExecuteDeleteAsync();
        await _db.StorePickupAddresses.ExecuteDeleteAsync();

        // Seller / end-user profiles (children of person).
        await _db.Sellers.ExecuteDeleteAsync();
        await _db.Endusers.ExecuteDeleteAsync();

        // Permissions belonging to non-admins (admins keep theirs).
        await _db.PersonPermissions
            .Where(pp => !_db.Systemadmins.Any(a => a.Personid == pp.Personid))
            .ExecuteDeleteAsync();

        // Finally the people themselves — everyone EXCEPT system administrators.
        var removed = await _db.People
            .Where(p => !_db.Systemadmins.Any(a => a.Personid == p.Personid))
            .ExecuteDeleteAsync();

        await tx.CommitAsync();
        return new AdminActionResult { Success = true, Message = $"{removed} user(s) and all their data deleted" };
    }

    public async Task<AdminPaged<AdminReportDto>> ListReportsAsync(Pagination pg)
    {
        var total = await _db.Reports.AsNoTracking().CountAsync();

        var rows = await _db.Reports.AsNoTracking()
            .Include(r => r.Reporter)
            .OrderByDescending(r => r.CreatedAt)
            .Skip(pg.Skip)
            .Take(pg.Take)
            .ToListAsync();

        var reports = rows.Select(r => new AdminReportDto
        {
            Id = r.ReportId.ToString(),
            Type = r.Type,
            Reason = r.Reason,
            Description = r.Description ?? "",
            Status = r.Status,
            AdminNote = r.AdminNote ?? "",
            ReporterName = r.Reporter is null ? null : FullName(r.Reporter.FirstName, r.Reporter.LastName),
            ProductId = r.Productid?.ToString(),
            StoreId = r.Sellerid?.ToString(),
            StoreOrderId = r.StoreOrderid?.ToString(),
            CustomRequestId = r.CustomRequestid?.ToString(),
            CreatedAt = DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc).ToString("o"),
        }).ToList();

        return new AdminPaged<AdminReportDto> { Items = reports, Total = total };
    }

    public async Task<AdminReportActionResult> HandleReportAsync(string reportId, AdminReportActionRequest body)
    {
        if (!int.TryParse(reportId, out var id))
            throw new NotFoundException("Report");

        var report = await _db.Reports.FirstOrDefaultAsync(r => r.ReportId == id)
            ?? throw new NotFoundException("Report");

        var statusMap = new Dictionary<string, string>
        {
            ["review"] = "REVIEWED",
            ["resolve"] = "RESOLVED",
            ["dismiss"] = "DISMISSED",
        };

        var mapped = body.Action is not null && statusMap.TryGetValue(body.Action, out var s) ? s : null;

        report.Status = mapped ?? "REVIEWED";
        report.AdminNote = string.IsNullOrEmpty(body.AdminNote) ? null : body.AdminNote;
        // reports timestamps are `timestamp without time zone` → Unspecified Kind.
        report.ResolvedAt = body.Action is "resolve" or "dismiss"
            ? DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            : null;

        await _db.SaveChangesAsync();

        return new AdminReportActionResult
        {
            Id = id.ToString(),
            Status = mapped,
        };
    }

    public async Task<IReadOnlyList<AdminRequestDto>> ListRequestsAsync()
    {
        var rows = await _db.CustomRequests.AsNoTracking()
            .Include(r => r.Category)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return rows.Select(r => new AdminRequestDto
        {
            Id = r.Requestid.ToString(),
            ItemName = r.Itemname,
            Description = r.Description,
            Category = r.Category?.CategoryName ?? "",
            Status = r.Status,
            CreatedAt = r.CreatedAt.ToString("o"),
        }).ToList();
    }

    // ---- Coupons (admin-managed) ----
    public async Task<IReadOnlyList<AdminCouponDto>> ListCouponsAsync()
    {
        var coupons = await _db.Coupons.AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return coupons.Select(MapCoupon).ToList();
    }

    public async Task<AdminCouponDto> CreateCouponAsync(int adminPersonId, AdminCreateCouponRequest body)
    {
        var scope = (body.Scope ?? "GLOBAL").ToUpperInvariant();
        var scopeInt = StatusMaps.CouponScopeCreate.TryGetValue(scope, out var sc) ? (short)sc : (short)0;

        // The coupons table uses `timestamp without time zone`, so Npgsql requires
        // DateTimes with Kind=Unspecified (a UTC-Kind value would target timestamptz).
        DateTime? expires = null;
        if (DateTime.TryParse(body.ExpiredDate, out var dt))
            expires = DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);

        int? storeId = int.TryParse(body.StoreId, out var sid) ? sid : null;

        var coupon = new Coupon
        {
            Code = string.IsNullOrWhiteSpace(body.Code) ? null : body.Code.Trim().ToUpperInvariant(),
            Description = string.IsNullOrWhiteSpace(body.Description) ? "Admin coupon" : body.Description,
            DiscountPercentage = (decimal)body.DiscountPercentage,
            Scope = scopeInt,
            Storeid = storeId,
            Creatorid = adminPersonId,
            Status = true,
            MaxUsers = body.MaxUsers,
            UsedCount = 0,
            CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
            ExpiredDate = expires,
        };
        _db.Coupons.Add(coupon);
        await _db.SaveChangesAsync();

        return MapCoupon(coupon);
    }

    public async Task<AdminActionResult> DeleteCouponAsync(string couponId)
    {
        if (!int.TryParse(couponId, out var id)) throw new NotFoundException("Coupon");

        var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Couponid == id)
            ?? throw new NotFoundException("Coupon");

        // Remove dependents first to satisfy FK constraints.
        var couponProducts = await _db.CouponProducts.Where(cp => cp.Couponid == id).ToListAsync();
        if (couponProducts.Count > 0) _db.CouponProducts.RemoveRange(couponProducts);

        var userCoupons = await _db.UserCoupons.Where(uc => uc.Couponid == id).ToListAsync();
        if (userCoupons.Count > 0) _db.UserCoupons.RemoveRange(userCoupons);

        _db.Coupons.Remove(coupon);
        await _db.SaveChangesAsync();

        return new AdminActionResult { Success = true, Message = "Coupon deleted" };
    }

    private static AdminCouponDto MapCoupon(Coupon c) => new()
    {
        Id = c.Couponid.ToString(),
        Code = c.Code ?? "",
        Description = c.Description,
        DiscountPercentage = c.DiscountPercentage.HasValue ? (double)c.DiscountPercentage.Value : 0,
        Scope = StatusMaps.CouponScope.TryGetValue(c.Scope, out var s) ? s : "GLOBAL",
        Active = c.Status ?? false,
        // Stored as Unspecified-kind (timestamp w/o tz) — tag as UTC for the ISO string.
        ExpiredDate = c.ExpiredDate is DateTime ed ? DateTime.SpecifyKind(ed, DateTimeKind.Utc).ToString("o") : null,
        MaxUsers = c.MaxUsers ?? 0,
        UsedCount = c.UsedCount ?? 0,
        StoreId = c.Storeid?.ToString(),
        CreatedAt = DateTime.SpecifyKind(c.CreatedAt, DateTimeKind.Utc).ToString("o"),
    };

    // ---- Conversation monitoring (custom-order seller↔buyer chats) ----

    public async Task<IReadOnlyList<AdminConversationDto>> ListConversationsAsync()
    {
        var offers = await _db.Offers.AsNoTracking()
            .Include(o => o.Seller)
            .Include(o => o.Request).ThenInclude(r => r!.Enduser).ThenInclude(e => e!.Person)
            .Include(o => o.OfferMessages)
            .Where(o => o.OfferMessages.Any())
            .ToListAsync();

        return offers
            .OrderByDescending(o => o.OfferMessages.Max(m => m.CreatedAt))
            .Select(o => new AdminConversationDto
            {
                Id = o.OfferId.ToString(),
                ItemName = o.Request?.Itemname ?? "Custom request",
                BuyerName = FullName(o.Request?.Enduser?.Person?.FirstName, o.Request?.Enduser?.Person?.LastName),
                SellerName = o.Seller?.Storename ?? "",
                Status = o.Status,
                MessageCount = o.OfferMessages.Count,
                LastMessageAt = o.OfferMessages.Max(m => (DateTime?)m.CreatedAt)?.ToUniversalTime().ToString("o"),
            })
            .ToList();
    }

    public async Task<AdminConversationDetailDto> GetConversationAsync(string offerId)
    {
        if (!int.TryParse(offerId, out var id)) throw new NotFoundException("Conversation");

        var offer = await _db.Offers.AsNoTracking()
            .Include(o => o.Seller)
            .Include(o => o.Request).ThenInclude(r => r!.Enduser).ThenInclude(e => e!.Person)
            .Include(o => o.OfferMessages)
            .FirstOrDefaultAsync(o => o.OfferId == id)
            ?? throw new NotFoundException("Conversation");

        return new AdminConversationDetailDto
        {
            Id = offer.OfferId.ToString(),
            RequestId = offer.Requestid.ToString(),
            ItemName = offer.Request?.Itemname ?? "Custom request",
            BuyerName = FullName(offer.Request?.Enduser?.Person?.FirstName, offer.Request?.Enduser?.Person?.LastName),
            SellerName = offer.Seller?.Storename ?? "",
            Status = offer.Status,
            Messages = offer.OfferMessages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new AdminMessageDto
                {
                    Id = m.MessageId.ToString(),
                    Author = m.AuthorType,
                    Text = m.Text,
                    ImageUrl = m.ImageUrl,
                    CreatedAt = m.CreatedAt.ToUniversalTime().ToString("o"),
                })
                .ToList(),
        };
    }

    // ---- Admin identity, moderators & permissions ----

    /// <summary>Admin dashboard sections ↔ the integer codes stored in person_permission.</summary>
    private static readonly IReadOnlyDictionary<string, int> PermissionCodes = new Dictionary<string, int>
    {
        ["orders"] = 1,
        ["products"] = 2,
        ["stores"] = 3,
        ["reports"] = 4,
        ["requests"] = 5,
        ["coupons"] = 6,
    };
    private static IReadOnlyList<string> AllSections => PermissionCodes.Keys.ToList();
    private static string? KeyForCode(int code) =>
        PermissionCodes.FirstOrDefault(kv => kv.Value == code).Key;

    private async Task<(bool IsSuper, HashSet<string> Perms)> GetContextAsync(int personId)
    {
        var admin = await _db.Systemadmins.AsNoTracking().FirstOrDefaultAsync(a => a.Personid == personId)
            ?? throw new ForbiddenException("Not an administrator");

        // A full ("super") admin has no supervisor and can access everything.
        if (admin.Supervisorid is null)
            return (true, AllSections.ToHashSet());

        var codes = await _db.PersonPermissions.AsNoTracking()
            .Where(p => p.Personid == personId)
            .Select(p => p.Permission)
            .ToListAsync();
        var perms = codes.Select(KeyForCode).Where(k => k is not null).Select(k => k!).ToHashSet();
        return (false, perms);
    }

    public async Task<AdminMeDto> GetMeAsync(int personId)
    {
        var (isSuper, perms) = await GetContextAsync(personId);
        var person = await _db.People.AsNoTracking().FirstOrDefaultAsync(p => p.Personid == personId);
        return new AdminMeDto
        {
            Id = personId.ToString(),
            Name = FullName(person?.FirstName, person?.LastName),
            IsSuperAdmin = isSuper,
            Permissions = perms.ToList(),
        };
    }

    /// <summary>Throws unless the caller is a full admin or a moderator granted the section.</summary>
    public async Task EnsureSectionAsync(int personId, string section)
    {
        var (isSuper, perms) = await GetContextAsync(personId);
        if (isSuper) return;
        if (!perms.Contains(section))
            throw new ForbiddenException($"You don't have permission to manage {section}.");
    }

    private async Task EnsureSuperAdminAsync(int personId)
    {
        var (isSuper, _) = await GetContextAsync(personId);
        if (!isSuper) throw new ForbiddenException("Only a full administrator can manage moderators.");
    }

    public async Task<IReadOnlyList<AdminModeratorDto>> ListModeratorsAsync(int callerPersonId)
    {
        await EnsureSuperAdminAsync(callerPersonId);

        var mods = await _db.Systemadmins.AsNoTracking()
            .Where(a => a.Supervisorid != null)
            .Include(a => a.Person)
            .ToListAsync();

        var result = new List<AdminModeratorDto>();
        foreach (var m in mods)
        {
            var codes = await _db.PersonPermissions.AsNoTracking()
                .Where(p => p.Personid == m.Personid)
                .Select(p => p.Permission)
                .ToListAsync();
            result.Add(new AdminModeratorDto
            {
                Id = m.Personid.ToString(),
                Name = FullName(m.Person?.FirstName, m.Person?.LastName),
                Email = m.Person?.Email,
                Permissions = codes.Select(KeyForCode).Where(k => k is not null).Select(k => k!).ToList(),
            });
        }
        return result;
    }

    public async Task<AdminModeratorDto> SetModeratorPermissionsAsync(int callerPersonId, string moderatorId, SetModeratorPermissionsRequest body)
    {
        await EnsureSuperAdminAsync(callerPersonId);
        if (!int.TryParse(moderatorId, out var targetPersonId)) throw new NotFoundException("Moderator");

        var target = await _db.Systemadmins.AsNoTracking().FirstOrDefaultAsync(a => a.Personid == targetPersonId)
            ?? throw new NotFoundException("Moderator");
        if (target.Supervisorid is null)
            throw new ValidationAppException("That account is a full administrator, not a moderator.");

        var existing = await _db.PersonPermissions.Where(p => p.Personid == targetPersonId).ToListAsync();
        if (existing.Count > 0) _db.PersonPermissions.RemoveRange(existing);

        var codes = (body.Permissions ?? new List<string>())
            .Select(k => PermissionCodes.TryGetValue((k ?? "").ToLowerInvariant(), out var c) ? c : -1)
            .Where(c => c > 0)
            .Distinct();
        foreach (var c in codes)
            _db.PersonPermissions.Add(new PersonPermission { Personid = targetPersonId, Permission = c });

        await _db.SaveChangesAsync();

        var person = await _db.People.AsNoTracking().FirstOrDefaultAsync(p => p.Personid == targetPersonId);
        var keys = (body.Permissions ?? new List<string>())
            .Where(k => PermissionCodes.ContainsKey((k ?? "").ToLowerInvariant()))
            .Select(k => k.ToLowerInvariant()).Distinct().ToList();
        return new AdminModeratorDto
        {
            Id = targetPersonId.ToString(),
            Name = FullName(person?.FirstName, person?.LastName),
            Email = person?.Email,
            Permissions = keys,
        };
    }

    private static string FullName(string? first, string? last) =>
        string.Join(" ", new[] { first, last }.Where(s => !string.IsNullOrWhiteSpace(s)));
}
