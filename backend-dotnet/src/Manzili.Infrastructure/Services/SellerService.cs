using Manzili.Application.Common;
using Manzili.Application.Seller;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>Port of Node services/seller.service.js.</summary>
public sealed class SellerService
{
    private readonly ManziliDbContext _db;
    private readonly FulfillmentService _fulfillment;
    private readonly SemanticSearchService _semantic;

    public SellerService(ManziliDbContext db, FulfillmentService fulfillment, SemanticSearchService semantic)
    {
        _db = db;
        _fulfillment = fulfillment;
        _semantic = semantic;
    }

    // ---- Dashboard ----
    public async Task<DashboardDto> GetDashboardAsync(int sellerid)
    {
        var totalProducts = await _db.Products
            .CountAsync(p => p.Sellerid == sellerid && p.IsDisabled != true);

        var totalOrders = await _db.StoreOrders.CountAsync(so => so.Sellerid == sellerid);

        var ratings = await _db.ReviewingAndRatings
            .Where(r => r.Product.Sellerid == sellerid)
            .Select(r => r.Rating)
            .ToListAsync();

        var totalEarnings = await _db.StoreOrders
            .Where(so => so.Sellerid == sellerid && so.IsPaid)
            .SumAsync(so => (decimal?)so.Total) ?? 0m;

        var avgRating = ratings.Count > 0 ? ratings.Sum() / ratings.Count : 0d;

        return new DashboardDto
        {
            TotalProducts = totalProducts,
            TotalEarnings = (double)totalEarnings,
            TotalOrders = totalOrders,
            AverageRating = Math.Round(avgRating * 10) / 10,
            TotalReviews = ratings.Count,
        };
    }

    // ---- Products ----
    public async Task<SellerProductsResult> ListSellerProductsAsync(int sellerid)
    {
        // Include disabled products too — the manage-product table shows them with a
        // "Disabled" badge and lets the seller re-enable them (the storefront/public
        // queries filter IsDisabled separately, so hidden products never leak there).
        var products = await _db.Products
            .AsNoTracking()
            .Where(p => p.Sellerid == sellerid)
            .Include(p => p.Category)
            .Include(p => p.ProductImages)
            .Include(p => p.StoreOrderItems)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        // Active promotions for this seller → product id ⇒ latest expiry (so the manage-product
        // page can badge promoted items and show when the feature ends).
        var now = DateTime.UtcNow;
        var activePromos = await _db.Promotions.AsNoTracking()
            .Where(x => x.Sellerid == sellerid && x.ExpiresAt > now)
            .GroupBy(x => x.Productid)
            .Select(g => new { ProductId = g.Key, Until = g.Max(x => x.ExpiresAt) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Until);

        var items = products.Select(p => new SellerProductListItemDto
        {
            Id = p.Productid.ToString(),
            Name = p.Productname,
            MainImage = p.CoverUrl
                ?? p.ProductImages.Select(i => i.ImageUrl).FirstOrDefault(),
            Price = p.Mrp.HasValue ? (double)p.Mrp.Value : (double)(p.Price ?? 0m),
            OfferPrice = p.Mrp.HasValue && p.Price.HasValue ? (double)p.Price.Value : null,
            InStock = p.InStock ?? true,
            Stock = p.Stock ?? 0,
            TotalSold = p.StoreOrderItems.Sum(i => i.Quantity),
            Category = p.Category?.CategoryName ?? "",
            IsDisabled = p.IsDisabled == true,
            ShippingSize = string.IsNullOrEmpty(p.ShippingSize) ? "MEDIUM" : p.ShippingSize,
            ShippingBulkyCategory = string.IsNullOrEmpty(p.ShippingBulkyCategory) ? "NORMAL" : p.ShippingBulkyCategory,
            IsPromoted = activePromos.ContainsKey(p.Productid),
            PromotedUntil = activePromos.TryGetValue(p.Productid, out var until)
                ? until.ToString("yyyy-MM-ddTHH:mm:ss") + "Z"
                : null,
        }).ToList();

        return new SellerProductsResult { Products = items, Total = items.Count };
    }

    public async Task<ProductDetailDto> CreateProductAsync(int sellerid, CreateProductRequest body)
    {
        short? categoryid = null;
        // Resolve / create category (case-insensitive match like Node).
        if (!string.IsNullOrWhiteSpace(body.Category))
        {
            categoryid = await ResolveCategoryAsync(body.Category);
        }

        await using var tx = await _db.Database.BeginTransactionAsync();

        var stock = body.Stock ?? 10;
        // Pricing: Mrp is the product's normal price; Price is an OPTIONAL sale price.
        // Persist the sale only when it's a real discount below Mrp — otherwise sell at
        // Mrp, so a seller who left the sale field at 0 never stores "0" as the price.
        var mrp = body.Mrp ?? 0m;
        var sale = body.Price ?? 0m;
        if (mrp <= 0m && sale > 0m) mrp = sale;
        var price = sale > 0m && sale < mrp ? sale : mrp;
        var product = new Product
        {
            Productname = body.Name ?? "",
            Description = body.Description,
            Price = price,
            Mrp = mrp,
            Stock = stock,
            InStock = stock > 0,
            Sellerid = sellerid,
            Categoryid = categoryid,
            CoverUrl = body.Images is { Count: > 0 } ? body.Images[0] : null,
            ShippingSize = string.IsNullOrEmpty(body.ShippingSize) ? "MEDIUM" : body.ShippingSize,
            ShippingBulkyCategory = string.IsNullOrEmpty(body.ShippingBulkyCategory) ? "NORMAL" : body.ShippingBulkyCategory,
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        if (body.Images is { Count: > 0 })
        {
            foreach (var url in body.Images)
            {
                _db.ProductImages.Add(new ProductImage
                {
                    Productid = product.Productid,
                    Productimage = Array.Empty<byte>(),
                    ImageUrl = url,
                    UploadDate = DateOnly.FromDateTime(DateTime.UtcNow),
                });
            }
            await _db.SaveChangesAsync();
        }

        if (body.Variants is { Count: > 0 })
        {
            foreach (var v in body.Variants)
            {
                var variant = new ProductVariant
                {
                    Productid = product.Productid,
                    VariantName = v.Name ?? "",
                };
                _db.ProductVariants.Add(variant);
                await _db.SaveChangesAsync();

                foreach (var opt in v.Options ?? [])
                {
                    _db.VariantOptions.Add(new VariantOption
                    {
                        VariantId = variant.VariantId,
                        Value = opt.Value ?? "",
                        Stock = opt.Stock ?? 0,
                        PriceDelta = opt.PriceDelta ?? 0m,
                        Swatch = opt.Swatch,
                        ImageUrl = opt.ImageUrl,
                    });
                }
            }
            await _db.SaveChangesAsync();
        }

        await tx.CommitAsync();

        // Embed the new product for semantic "describe-it" search (best-effort; never blocks the save).
        await _semantic.IndexProductAsync(product.Productid);

        return await LoadProductDetailAsync(product.Productid);
    }

    public async Task<ProductDetailDto> UpdateProductAsync(int sellerid, int productId, UpdateProductRequest body)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Productid == productId)
            ?? throw new NotFoundException("Product");
        if (product.Sellerid != sellerid) throw new ForbiddenException("Not your product");

        // Everything below is one logical update — wrap it so a failure (e.g. while
        // replacing variants or images) never leaves the product half-edited.
        await using var tx = await _db.Database.BeginTransactionAsync();

        if (!string.IsNullOrEmpty(body.Name)) product.Productname = body.Name;
        if (body.Description is not null) product.Description = body.Description;
        if (body.Mrp.HasValue) product.Mrp = body.Mrp;
        if (body.Price.HasValue) product.Price = body.Price;
        // Re-normalize the selling price vs. the list price (see CreateProductAsync).
        {
            var mrp = product.Mrp ?? 0m;
            var sale = product.Price ?? 0m;
            if (mrp <= 0m && sale > 0m) mrp = sale;
            product.Mrp = mrp;
            product.Price = sale > 0m && sale < mrp ? sale : mrp;
        }
        // Reconcile category (creates it case-insensitively if new, like CreateProductAsync).
        if (!string.IsNullOrWhiteSpace(body.Category))
            product.Categoryid = await ResolveCategoryAsync(body.Category);
        if (body.Images is { Count: > 0 }) product.CoverUrl = body.Images[0];
        if (!string.IsNullOrEmpty(body.ShippingSize)) product.ShippingSize = body.ShippingSize;
        if (!string.IsNullOrEmpty(body.ShippingBulkyCategory)) product.ShippingBulkyCategory = body.ShippingBulkyCategory;

        await _db.SaveChangesAsync();

        if (body.Images is not null)
        {
            var existing = await _db.ProductImages.Where(i => i.Productid == productId).ToListAsync();
            _db.ProductImages.RemoveRange(existing);
            foreach (var url in body.Images)
            {
                _db.ProductImages.Add(new ProductImage
                {
                    Productid = productId,
                    Productimage = Array.Empty<byte>(),
                    ImageUrl = url,
                    UploadDate = DateOnly.FromDateTime(DateTime.UtcNow),
                });
            }
            await _db.SaveChangesAsync();
        }

        // Replace the whole variant set when supplied (delete-and-reinsert groups + options).
        // The seller form always sends the full grouped list, so this is the source of truth.
        if (body.Variants is not null)
        {
            var grpIds = await _db.ProductVariants
                .Where(v => v.Productid == productId)
                .Select(v => v.VariantId)
                .ToListAsync();
            await _db.VariantOptions.Where(o => grpIds.Contains(o.VariantId)).ExecuteDeleteAsync();
            await _db.ProductVariants.Where(v => v.Productid == productId).ExecuteDeleteAsync();

            foreach (var g in body.Variants)
            {
                var grp = new ProductVariant { Productid = productId, VariantName = g.Name ?? "" };
                _db.ProductVariants.Add(grp);
                await _db.SaveChangesAsync();

                foreach (var opt in g.Options ?? [])
                {
                    _db.VariantOptions.Add(new VariantOption
                    {
                        VariantId = grp.VariantId,
                        Value = opt.Value ?? "",
                        Stock = opt.Stock ?? 0,
                        PriceDelta = opt.PriceDelta ?? 0m,
                        Swatch = opt.Swatch,
                        ImageUrl = opt.ImageUrl,
                    });
                }
            }
            await _db.SaveChangesAsync();
        }

        // Stock: when the product carries variants, its top-level stock is the sum of
        // option stocks (per-option is the authority); otherwise use the entered value.
        var grpIdsForStock = await _db.ProductVariants
            .Where(v => v.Productid == productId)
            .Select(v => v.VariantId)
            .ToListAsync();
        if (grpIdsForStock.Count > 0)
        {
            var variantStock = await _db.VariantOptions
                .Where(o => grpIdsForStock.Contains(o.VariantId))
                .SumAsync(o => (int?)o.Stock) ?? 0;
            product.Stock = variantStock;
            product.InStock = variantStock > 0;
        }
        else if (body.Stock.HasValue)
        {
            product.Stock = body.Stock;
            product.InStock = body.InStock ?? body.Stock > 0;
        }
        else if (body.InStock.HasValue)
        {
            product.InStock = body.InStock;
        }
        await _db.SaveChangesAsync();

        await tx.CommitAsync();

        // Re-embed after an edit so semantic search reflects the new name/description/category.
        await _semantic.IndexProductAsync(productId);

        return await LoadProductDetailAsync(productId);
    }

    public async Task<string> DeleteProductAsync(int sellerid, int productId)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Productid == productId)
            ?? throw new NotFoundException("Product");
        if (product.Sellerid != sellerid) throw new ForbiddenException("Not your product");

        product.IsDisabled = true;
        await _db.SaveChangesAsync();
        return "Product deleted";
    }

    // ---- Orders ----
    public async Task<SellerOrdersResult> GetSellerOrdersAsync(int sellerid)
    {
        var storeOrders = await _db.StoreOrders
            .AsNoTracking()
            .Where(so => so.Sellerid == sellerid)
            .Include(so => so.StoreOrderItems)
            .Include(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .Include(so => so.Order).ThenInclude(o => o.Enduser).ThenInclude(e => e!.Person)
            .Include(so => so.Order).ThenInclude(o => o.Address!)
            .OrderByDescending(so => so.CreatedAt)
            .ToListAsync();

        // A seller only sees a real order: one that's paid, or COD (pay-on-delivery). An unpaid
        // online-payment attempt (Stripe/Wallet/Fawry) the buyer never completed — or any canceled
        // row — is never surfaced, so the seller never tries to fulfil a phantom order.
        var orders = storeOrders
            .Where(so => !string.Equals(so.Status, "CANCELED", StringComparison.OrdinalIgnoreCase)
                && (so.IsPaid || string.Equals(so.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase)))
            .Select(so =>
        {
            var person = so.Order.Enduser?.Person;
            var customerName = string.Join(" ",
                new[] { person?.FirstName, person?.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
            if (string.IsNullOrWhiteSpace(customerName)) customerName = "Unknown";

            return new SellerOrderDto
            {
                Id = so.StoreOrderid.ToString(),
                CustomerName = customerName,
                Items = so.StoreOrderItems
                    .Select(i => new OrderItemDto { Name = i.ProductName, Quantity = i.Quantity })
                    .ToList(),
                Total = (double)so.Total,
                Status = so.Status.ToLowerInvariant(),
                PaymentMethod = so.PaymentMethod,
                IsPaid = so.IsPaid,
                CreatedAt = ToIso(so.CreatedAt)!,
                Address = so.Order.Address is null ? null : new OrderAddressDto
                {
                    City = so.Order.Address.City ?? "",
                    District = so.Order.Address.District ?? "",
                },
                Shipment = so.Shipment is null ? null : ShipmentMapper.Map(so.Shipment),
            };
        }).ToList();

        return new SellerOrdersResult { Orders = orders, Total = orders.Count };
    }

    /// <summary>
    /// Seller advances a store order's status. Delegates to <see cref="FulfillmentService"/> so the
    /// transition drives the Bosta shipment, seller wallet, buyer notifications and the review unlock
    /// (SHIPPED → in transit; DELIVERED → funds released + "you can review now").
    /// </summary>
    /// <summary>Statuses a SELLER is allowed to set. The seller's only fulfilment action is to
    /// confirm an order for pickup (PROCESSING) — which hands it to Bosta. Everything after that
    /// (SHIPPED / IN_TRANSIT / DELIVERED) is driven automatically by Bosta webhooks, or forced by an
    /// admin. This prevents a seller from freely faking shipping/delivery states.</summary>
    // A seller drives their own order through the fulfilment lifecycle:
    // ORDER_PLACED → PROCESSING (confirm & request pickup) → SHIPPED → DELIVERED. This works for
    // COD orders too (no online payment required to proceed — the courier settles the cash on
    // delivery, at which point the order is marked paid and the wallet is released). Bosta webhooks
    // drive the same transitions when configured; this lets the seller move it manually otherwise.
    private static readonly HashSet<string> SellerAllowedStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "PROCESSING", "SHIPPED", "DELIVERED" };

    public async Task<OrderStatusResult> UpdateOrderStatusAsync(int sellerid, int storeOrderId, string status)
    {
        if (!SellerAllowedStatuses.Contains((status ?? "").Trim()))
            throw new ForbiddenException(
                "A seller can move an order through Processing, Shipped and Delivered. Cancellations and returns are handled separately.");

        var newStatus = await _fulfillment.TransitionStoreOrderStatusAsync(storeOrderId, status, sellerid);
        return new OrderStatusResult { Id = storeOrderId.ToString(), Status = newStatus };
    }

    // ---- Settings ----
    public async Task<SettingsDto> GetSettingsAsync(int sellerid)
    {
        var seller = await _db.Sellers
            .AsNoTracking()
            .Include(s => s.StorePickupAddresses)
            .FirstOrDefaultAsync(s => s.Sellerid == sellerid)
            ?? throw new NotFoundException("Store");

        return MapSettings(seller);
    }

    public async Task<SettingsDto> UpdateSettingsAsync(int sellerid, UpdateSettingsRequest body)
    {
        var seller = await _db.Sellers.FirstOrDefaultAsync(s => s.Sellerid == sellerid)
            ?? throw new NotFoundException("Store");

        if (!string.IsNullOrEmpty(body.Name)) seller.Storename = body.Name;
        if (body.Description is not null) seller.StoreDescription = body.Description;
        if (!string.IsNullOrEmpty(body.Email)) seller.Email = body.Email;
        if (!string.IsNullOrEmpty(body.Phone)) seller.Phone = body.Phone;
        if (!string.IsNullOrEmpty(body.Logo)) seller.LogoUrl = body.Logo;
        if (!string.IsNullOrEmpty(body.Address)) seller.AddressText = body.Address;

        await _db.SaveChangesAsync();

        return await GetSettingsAsync(sellerid);
    }

    // ---- Custom requests relevant to this seller ----
    // The seller dashboard shows only requests that concern THIS seller:
    //   - private requests targeted directly to them (Sellerid == sellerid), or
    //   - open requests they've actually engaged with (made an offer on).
    // The full open marketplace board lives on the public /custom page for discovery,
    // so the dashboard isn't flooded with every open request on the platform.
    public async Task<IReadOnlyList<CustomRequestDto>> ListSellerRequestsAsync(int sellerid)
    {
        var requests = await _db.CustomRequests
            .AsNoTracking()
            .Where(r => r.Sellerid == sellerid
                || _db.Offers.Any(o => o.Requestid == r.Requestid && o.Sellerid == sellerid))
            .Include(r => r.Category)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return requests.Select(MapRequest).ToList();
    }

    private static CustomRequestDto MapRequest(CustomRequest r) => new()
    {
        Id = r.Requestid.ToString(),
        ItemName = r.Itemname,
        Description = r.Description,
        Images = r.ImageUrls ?? [],
        Visibility = r.Visibility ? "open" : "private",
        Category = r.Category?.CategoryName ?? "",
        Quantity = r.Quantity ?? 1,
        Size = (r.Lenght.HasValue || r.Width.HasValue || r.Hight.HasValue)
            ? new CustomRequestSizeDto { Length = r.Lenght, Width = r.Width, Height = r.Hight }
            : null,
        Material = r.Matrial,
        DeliveryDate = ToIsoDate(r.DesiredDeliveryDate),
        VoiceMemoUrl = r.VoicememoUrl,
        StoreId = r.Sellerid?.ToString(),
        Status = r.Status,
        CreatedAt = ToIsoDate(r.CreatedAt),
    };

    private static string ToIsoDate(DateOnly date) =>
        date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

    private static string? ToIsoDate(DateOnly? date) =>
        date is null ? null : ToIsoDate(date.Value);

    // ---- Helpers ----
    private static SettingsDto MapSettings(Seller seller) => new()
    {
        Name = seller.Storename ?? "",
        Logo = seller.LogoUrl,
        Description = seller.StoreDescription ?? "",
        Email = seller.Email ?? "",
        Phone = seller.Phone ?? "",
        Address = seller.AddressText ?? "",
        // The default warehouse doubles as the settings "pickup address" summary.
        PickupAddress = MapPickup(seller.StorePickupAddresses),
    };

    private static PickupAddressDto? MapPickup(IEnumerable<StorePickupAddress> warehouses)
    {
        var w = warehouses.FirstOrDefault(x => x.IsDefault) ?? warehouses.FirstOrDefault();
        return w is null ? null : new PickupAddressDto
        {
            FirstLine = w.FirstLine,
            City = w.City,
            Phone = w.Phone ?? "",
            ContactName = w.ContactName ?? "",
        };
    }

    private async Task<short> ResolveCategoryAsync(string name)
    {
        var cat = await _db.Categories
            .FirstOrDefaultAsync(c => c.CategoryName.ToLower() == name.ToLower());
        if (cat is null)
        {
            cat = new Category { CategoryName = name };
            _db.Categories.Add(cat);
            await _db.SaveChangesAsync();
        }
        return cat.Categoryid;
    }

    private async Task<ProductDetailDto> LoadProductDetailAsync(int productId)
    {
        var p = await _db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Seller)
            .Include(x => x.ProductImages)
            .Include(x => x.ProductVariants).ThenInclude(v => v.VariantOptions)
            .FirstAsync(x => x.Productid == productId);

        return new ProductDetailDto
        {
            Id = p.Productid.ToString(),
            Name = p.Productname,
            Images = p.ProductImages
                .Where(i => !string.IsNullOrEmpty(i.ImageUrl))
                .Select(i => new ProductImageDto { Src = i.ImageUrl!, Width = 800, Height = 800 })
                .ToList(),
            Price = p.Mrp.HasValue ? (double)p.Mrp.Value : (double)(p.Price ?? 0m),
            OfferPrice = p.Mrp.HasValue && p.Price.HasValue ? (double)p.Price.Value : null,
            IsWishlisted = false,
            Category = p.Category is not null ? new[] { p.Category.CategoryName } : [],
            Description = p.Description ?? "",
            Size = [],
            Stock = p.Stock ?? 0,
            InStock = p.InStock ?? (p.Stock ?? 0) > 0,
            Store = p.Seller is null ? null : new ProductStoreDto
            {
                Id = p.Seller.Sellerid.ToString(),
                Name = p.Seller.Storename ?? "",
            },
            Variants = p.ProductVariants.Count > 0
                ? p.ProductVariants.Select(v => new ProductVariantDto
                {
                    Id = v.VariantId.ToString(),
                    Name = v.VariantName,
                    Options = v.VariantOptions.Select(o => new ProductVariantOptionDto
                    {
                        Id = o.OptionId.ToString(),
                        Value = o.Value,
                        Stock = o.Stock,
                        PriceDelta = o.PriceDelta,
                        Swatch = o.Swatch,
                        ImageUrl = o.ImageUrl,
                    }).ToList(),
                }).ToList()
                : null,
        };
    }

    // ---- Seller-scoped single product (edit prefill + status) ----
    /// <summary>Load a seller's own product (disabled or not) for the edit form. Asserts ownership.</summary>
    public async Task<SellerProductDetailDto> GetSellerProductAsync(int sellerid, int productId)
    {
        var p = await _db.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.ProductImages)
            .Include(x => x.ProductVariants).ThenInclude(v => v.VariantOptions)
            .FirstOrDefaultAsync(x => x.Productid == productId)
            ?? throw new NotFoundException("Product");
        if (p.Sellerid != sellerid) throw new ForbiddenException("Not your product");

        return new SellerProductDetailDto
        {
            Id = p.Productid.ToString(),
            Name = p.Productname,
            Description = p.Description ?? "",
            Category = p.Category?.CategoryName ?? "",
            Mrp = p.Mrp.HasValue ? (double)p.Mrp.Value : (double)(p.Price ?? 0m),
            OfferPrice = p.Mrp.HasValue && p.Price.HasValue ? (double)p.Price.Value : null,
            Stock = p.Stock ?? 0,
            InStock = p.InStock ?? (p.Stock ?? 0) > 0,
            IsDisabled = p.IsDisabled == true,
            Images = p.ProductImages
                .Where(i => !string.IsNullOrEmpty(i.ImageUrl))
                .Select(i => i.ImageUrl!)
                .ToList(),
            ShippingSize = p.ShippingSize ?? "MEDIUM",
            ShippingBulkyCategory = p.ShippingBulkyCategory ?? "NORMAL",
            Variants = p.ProductVariants.Count > 0
                ? p.ProductVariants.Select(v => new ProductVariantDto
                {
                    Id = v.VariantId.ToString(),
                    Name = v.VariantName,
                    Options = v.VariantOptions.Select(o => new ProductVariantOptionDto
                    {
                        Id = o.OptionId.ToString(),
                        Value = o.Value,
                        Stock = o.Stock,
                        PriceDelta = o.PriceDelta,
                        Swatch = o.Swatch,
                        ImageUrl = o.ImageUrl,
                    }).ToList(),
                }).ToList()
                : null,
        };
    }

    /// <summary>Enable/disable (hide) a seller's own product. Drives Product.IsDisabled.</summary>
    public async Task<SellerProductDetailDto> SetProductDisabledAsync(int sellerid, int productId, bool disabled)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Productid == productId)
            ?? throw new NotFoundException("Product");
        if (product.Sellerid != sellerid) throw new ForbiddenException("Not your product");

        product.IsDisabled = disabled;
        await _db.SaveChangesAsync();

        return await GetSellerProductAsync(sellerid, productId);
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
