using System.Text.Json;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Manzili.Application.Orders;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of Node services/order.service.js (buyer side).
/// Splits a single order into per-seller store_orders + store_order_items, snapshots
/// price_at_purchase, applies a coupon discount pro-rata across stores, and decrements stock.
/// </summary>
public sealed class OrderService
{
    private readonly ManziliDbContext _db;
    private readonly FeesOptions _fees;

    public OrderService(ManziliDbContext db, IOptions<AppOptions> options)
    {
        _db = db;
        _fees = options.Value.Fees;
    }

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    // ---------- Public API ----------

    public async Task<OrderDetailDto> CreateOrderAsync(int personId, CreateOrderRequest req)
    {
        var enduser = await _db.Endusers.FirstOrDefaultAsync(e => e.Personid == personId)
            ?? throw new NotFoundException("User");

        if (!int.TryParse(req.AddressId, out var addrId))
            throw new ValidationAppException("Invalid address");

        var address = await _db.Addresses.FirstOrDefaultAsync(a => a.Id == addrId);
        if (address is null || address.Personid != personId)
            throw new ValidationAppException("Invalid address");

        // Validate products and group by seller
        var productIds = req.Items
            .Select(i => int.TryParse(i.ProductId, out var pid) ? pid : 0)
            .ToList();

        var products = await _db.Products
            .Include(p => p.Seller)
            .Where(p => productIds.Contains(p.Productid))
            .ToListAsync();
        var productMap = products.ToDictionary(p => p.Productid);

        // Group by seller, preserving item order (matches Node Map insertion order).
        var sellerGroups = new List<KeyValuePair<int, List<LineItem>>>();
        var sellerIndex = new Dictionary<int, List<LineItem>>();
        decimal subtotal = 0m;

        foreach (var item in req.Items)
        {
            _ = int.TryParse(item.ProductId, out var pid);
            if (!productMap.TryGetValue(pid, out var product))
                throw new ValidationAppException($"Product {item.ProductId} not found");
            if (product.InStock != true)
                throw new ValidationAppException($"Product {product.Productname} is out of stock");
            if (item.Quantity > (product.Stock ?? 0))
                throw new ValidationAppException($"Only {product.Stock ?? 0} of {product.Productname} left in stock");
            if (product.IsDisabled == true)
                throw new ValidationAppException($"{product.Productname} is no longer available");
            if (product.Seller is null || product.Seller.IsActive != true || product.Seller.StoreStatus != StatusMaps.StoreStatus.Approved)
                throw new ValidationAppException($"{product.Productname}'s store is currently unavailable");

            var selId = product.Sellerid ?? 0;
            if (!sellerIndex.TryGetValue(selId, out var list))
            {
                list = new List<LineItem>();
                sellerIndex[selId] = list;
                sellerGroups.Add(new KeyValuePair<int, List<LineItem>>(selId, list));
            }
            list.Add(new LineItem(product, pid, item.Quantity, item.Price));
            subtotal += UnitPrice(product, item.Price) * item.Quantity;
        }

        if (req.PaymentMethod is not ("COD" or "STRIPE" or "WALLET" or "FAWRY"))
            throw new ValidationAppException("Invalid payment method. Must be COD, STRIPE, WALLET or FAWRY");

        var paymentMethod = req.PaymentMethod!;
        var isCod = paymentMethod == "COD";
        // The orders.paymentmethod int is coarse (0=COD, 1=prepaid online). WALLET/FAWRY are prepaid
        // gateways (Kashier), so they share the STRIPE/prepaid code — this also dodges any legacy
        // CHECK(paymentmethod IN (0,1)) constraint. The REAL method is kept on StoreOrder.PaymentMethod.
        var paymentMethodInt = (short)(isCod ? 0 : 1);
        var isPrepaid = !isCod; // STRIPE, WALLET, FAWRY — paid online before fulfillment
        var discountAmount = req.Coupon?.DiscountAmount ?? 0m;
        var goodsTotal = Math.Max(0m, subtotal - discountAmount);

        // Marketplace fees: one Bosta shipment per seller; the buyer covers their 25% shipping
        // share + the Stripe processing fee, so Order.Totalamount is the full buyer charge.
        var perStoreShipping = _fees.DefaultShipping;
        var totalShipping = sellerGroups.Count * perStoreShipping;
        var buyerShippingShare = _fees.BuyerShip(totalShipping);
        // Only Stripe (card) carries a processing fee; COD and the Kashier wallet/Fawry paths don't.
        var stripeFee = paymentMethod == "STRIPE" ? _fees.StripeFee(goodsTotal + buyerShippingShare) : 0m;
        var buyerTotal = Math.Round(goodsTotal + buyerShippingShare + stripeFee, 2, MidpointRounding.AwayFromZero);

        var couponSnapshot = req.Coupon is null ? null : JsonSerializer.Serialize(req.Coupon, JsonOpts);

        int newOrderId;
        await using (var tx = await _db.Database.BeginTransactionAsync())
        {
            var newOrder = new Order
            {
                Enduserid = enduser.Enduserid,
                Status = (short)(isPrepaid ? 0 : 1), // prepaid → PENDING_PAYMENT; COD → ORDER_PLACED
                Totalamount = buyerTotal,
                Shippingcost = buyerShippingShare,
                Paymentid = 0,
                Paymentmethod = paymentMethodInt,
                Paymentstatus = 0,
                PaidAt = DateTime.UtcNow,
                IsPaid = false,
                AddressId = addrId,
                CouponSnapshot = couponSnapshot,
            };
            _db.Orders.Add(newOrder);
            await _db.SaveChangesAsync();

            foreach (var (selId, sellerItems) in sellerGroups)
            {
                var soSubtotal = sellerItems.Sum(i => UnitPrice(i.Product, i.FallbackPrice) * i.Quantity);
                var soDiscountRatio = subtotal > 0 ? soSubtotal / subtotal : 0m;
                var soDiscount = Math.Round(discountAmount * soDiscountRatio, 2, MidpointRounding.AwayFromZero);

                var storeOrder = new StoreOrder
                {
                    Orderid = newOrder.Orderid,
                    Sellerid = selId,
                    Subtotal = soSubtotal,
                    DiscountTotal = soDiscount,
                    ShippingTotal = perStoreShipping,
                    Total = Math.Max(0m, soSubtotal - soDiscount),
                    Status = isPrepaid ? "PENDING_PAYMENT" : "ORDER_PLACED",
                    IsPaid = false,
                    PaymentMethod = paymentMethod,
                };
                _db.StoreOrders.Add(storeOrder);
                await _db.SaveChangesAsync();

                foreach (var i in sellerItems)
                {
                    _db.StoreOrderItems.Add(new StoreOrderItem
                    {
                        StoreOrderid = storeOrder.StoreOrderid,
                        Productid = i.Productid,
                        Quantity = i.Quantity,
                        PriceAtPurchase = UnitPrice(i.Product, i.FallbackPrice),
                        ProductName = i.Product.Productname,
                        ProductImageUrl = i.Product.CoverUrl,
                        ShippingSize = i.Product.ShippingSize,
                        ShippingBulkyCat = i.Product.ShippingBulkyCategory,
                    });

                    // Decrement stock; mark out of stock once depleted.
                    i.Product.Stock = Math.Max(0, (i.Product.Stock ?? 0) - i.Quantity);
                    if (i.Product.Stock <= 0) i.Product.InStock = false;
                }
                await _db.SaveChangesAsync();
            }

            await tx.CommitAsync();
            newOrderId = newOrder.Orderid;
        }

        var fullOrder = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Address)
            .Include(o => o.StoreOrders).ThenInclude(so => so.StoreOrderItems)
            .Include(o => o.StoreOrders).ThenInclude(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .FirstAsync(o => o.Orderid == newOrderId);

        return MapOrderDetail(fullOrder);
    }

    public async Task<ListOrdersResult> ListOrdersAsync(int personId)
    {
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        if (enduser is null) return new ListOrdersResult(new List<OrderSummaryDto>(), 0);

        var orders = await _db.Orders
            .AsNoTracking()
            .Where(o => o.Enduserid == enduser.Enduserid)
            .Include(o => o.StoreOrders).ThenInclude(so => so.StoreOrderItems)
            .Include(o => o.StoreOrders).ThenInclude(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .OrderByDescending(o => o.Orderid)
            .ToListAsync();

        return new ListOrdersResult(orders.Select(MapOrderSummary).ToList(), orders.Count);
    }

    public async Task<OrderDetailDto> GetOrderByIdAsync(int personId, string orderId)
    {
        var enduser = await _db.Endusers.AsNoTracking().FirstOrDefaultAsync(e => e.Personid == personId);
        _ = int.TryParse(orderId, out var id);

        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Address)
            .Include(o => o.StoreOrders).ThenInclude(so => so.StoreOrderItems)
            .Include(o => o.StoreOrders).ThenInclude(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .FirstOrDefaultAsync(o => o.Orderid == id);

        if (order is null) throw new NotFoundException("Order");
        if (order.Enduserid != enduser?.Enduserid) throw new NotFoundException("Order");

        return MapOrderDetail(order);
    }

    // ---------- Mapping (mirrors Node mapOrderSummary / mapOrderDetail) ----------

    /// <summary>
    /// The buyer-facing payment method. The real value (COD/STRIPE/WALLET/FAWRY) lives on the store
    /// order's string column; the coarse orders.paymentmethod int only separates COD from prepaid.
    /// </summary>
    private static string DisplayPaymentMethod(Order order)
    {
        var m = order.StoreOrders.Select(so => so.PaymentMethod).FirstOrDefault(p => !string.IsNullOrWhiteSpace(p));
        if (!string.IsNullOrWhiteSpace(m)) return m!;
        return order.Paymentmethod == 0 ? "COD" : "STRIPE";
    }

    private static OrderSummaryDto MapOrderSummary(Order order)
    {
        var itemCount = order.StoreOrders.Sum(so => so.StoreOrderItems.Count);
        var shipments = MapShipments(order);
        return new OrderSummaryDto
        {
            Id = order.Orderid.ToString(),
            Status = StatusMaps.OrderStatus.TryGetValue(order.Status ?? -1, out var s) ? s : "UNKNOWN",
            ItemCount = itemCount,
            Total = order.Totalamount ?? 0m,
            IsPaid = order.IsPaid ?? false,
            PaymentMethod = DisplayPaymentMethod(order),
            Shipment = shipments.FirstOrDefault(),
            Shipments = shipments,
            CreatedAt = ToIso(order.CreatedAt) ?? ToIso(order.PaidAt),
        };
    }

    /// <summary>Maps every store order's Bosta shipment (with timeline) for the order views.</summary>
    private static List<ShipmentDto> MapShipments(Order order) =>
        order.StoreOrders
            .Where(so => so.Shipment is not null)
            .Select(so => ShipmentMapper.Map(so.Shipment!))
            .ToList();

    private static OrderDetailDto MapOrderDetail(Order order)
    {
        var items = new List<OrderItemDto>();
        foreach (var so in order.StoreOrders)
        {
            foreach (var item in so.StoreOrderItems)
            {
                items.Add(new OrderItemDto
                {
                    ProductId = item.Productid.ToString(),
                    Name = item.ProductName,
                    Quantity = item.Quantity,
                    UnitPrice = item.PriceAtPurchase,
                    TotalPrice = item.PriceAtPurchase * item.Quantity,
                });
            }
        }

        var shipments = MapShipments(order);

        return new OrderDetailDto
        {
            Id = order.Orderid.ToString(),
            Status = StatusMaps.OrderStatus.TryGetValue(order.Status ?? -1, out var s) ? s : "UNKNOWN",
            Items = items,
            Subtotal = items.Sum(i => i.TotalPrice),
            Discount = ReadDiscount(order.CouponSnapshot),
            Total = order.Totalamount ?? 0m,
            PaymentMethod = DisplayPaymentMethod(order),
            IsPaid = order.IsPaid ?? false,
            Shipment = shipments.FirstOrDefault(),
            Shipments = shipments,
            Address = order.Address is null ? null : new OrderAddressDto
            {
                Id = order.Address.Id.ToString(),
                Name = order.Address.Name ?? "",
                Phone = order.Address.Phone ?? "",
                City = order.Address.City ?? "",
                Zone = order.Address.Zone ?? "",
                District = order.Address.District ?? "",
                Street = order.Address.Street ?? "",
                Building = order.Address.Buildingnumber ?? "",
                Floor = order.Address.Floor ?? "",
                Apartment = order.Address.Apartmentnumber ?? "",
                PostalCode = order.Address.Postalcode ?? "",
            },
            CreatedAt = ToIso(order.CreatedAt) ?? ToIso(order.PaidAt),
        };
    }

    // ---------- Helpers ----------

    private readonly record struct LineItem(Product Product, int Productid, int Quantity, decimal? FallbackPrice);

    /// <summary>Node: Number(product.price || item.price). JS `||` treats 0/null as falsy → fall back.</summary>
    private static decimal UnitPrice(Product product, decimal? fallback)
    {
        var p = product.Price ?? 0m;
        if (p != 0m) return p;
        // A product with no sale price falls back to its list price (Mrp), never to 0,
        // so a row stored as price=0 can't be checked out for free.
        if (product.Mrp is { } mrp && mrp != 0m) return mrp;
        return fallback ?? 0m;
    }

    private static decimal? ReadDiscount(string? couponSnapshot)
    {
        if (string.IsNullOrWhiteSpace(couponSnapshot)) return null;
        try
        {
            using var doc = JsonDocument.Parse(couponSnapshot);
            if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                doc.RootElement.TryGetProperty("discountAmount", out var d) &&
                d.TryGetDecimal(out var val))
            {
                return val;
            }
            return 0m; // snapshot present but no discountAmount → Number(undefined||0) = 0
        }
        catch (JsonException)
        {
            return 0m;
        }
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
