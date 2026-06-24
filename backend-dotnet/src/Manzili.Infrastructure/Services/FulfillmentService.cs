using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Orchestrates the post-payment lifecycle for both standard and custom orders:
/// <list type="bullet">
///   <item>create one Bosta shipment per seller/store order (real API, with a graceful synthetic
///   fallback so the demo always completes), seed the tracking timeline, notify the seller to
///   prepare the pickup, and credit the seller wallet (pending);</item>
///   <item>advance a store order through SHIPPED → DELIVERED (seller action or Bosta webhook),
///   releasing wallet funds and unlocking reviews on delivery;</item>
///   <item>handle buyer-initiated returns with a Bosta reverse-logistics shipment and a wallet
///   reversal.</item>
/// </list>
/// All steps are idempotent (keyed by store order / offer) so re-runs never double-post.
/// </summary>
public sealed class FulfillmentService
{
    private readonly ManziliDbContext _db;
    private readonly WalletService _wallet;
    private readonly NotificationService _notify;
    private readonly BostaClient _bosta;
    private readonly BostaOptions _bostaOptions;
    private readonly FeesOptions _fees;
    private readonly ILogger<FulfillmentService> _log;

    public FulfillmentService(
        ManziliDbContext db,
        WalletService wallet,
        NotificationService notify,
        BostaClient bosta,
        IOptions<AppOptions> options,
        ILogger<FulfillmentService> log)
    {
        _db = db;
        _wallet = wallet;
        _notify = notify;
        _bosta = bosta;
        _bostaOptions = options.Value.Bosta;
        _fees = options.Value.Fees;
        _log = log;
    }

    // ===================== Payment confirmed → fulfill =====================

    /// <summary>
    /// Marks an order (and its store orders) paid, then fulfills it. Idempotent: safe to call
    /// from both the Stripe webhook and the synchronous /checkout/confirm fallback.
    /// </summary>
    public async Task MarkOrderPaidAndFulfillAsync(int orderId, string? paymentIntentId = null)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Orderid == orderId);
        if (order is null) return;

        if (order.IsPaid != true)
        {
            order.IsPaid = true;
            order.Paymentstatus = 1;
            if (!string.IsNullOrWhiteSpace(paymentIntentId)) order.StripePaymentIntentId = paymentIntentId;
            await _db.SaveChangesAsync();
        }

        await _db.StoreOrders
            .Where(so => so.Orderid == orderId && !so.IsPaid)
            .ExecuteUpdateAsync(s => s.SetProperty(so => so.IsPaid, true));

        await FulfillPaidOrderAsync(orderId);
    }

    /// <summary>Creates shipments for every not-yet-fulfilled store order in a paid order.</summary>
    public async Task FulfillPaidOrderAsync(int orderId)
    {
        var order = await _db.Orders
            .Include(o => o.Address)
            .Include(o => o.StoreOrders).ThenInclude(so => so.StoreOrderItems)
            .Include(o => o.StoreOrders).ThenInclude(so => so.Shipment)
            .FirstOrDefaultAsync(o => o.Orderid == orderId);
        if (order is null) return;

        foreach (var so in order.StoreOrders)
        {
            if (so.Shipment is not null) continue;          // already fulfilled
            if (so.Status is "CANCELED" or "RETURNED") continue;
            await CreateShipmentForStoreOrderAsync(order, so);
        }

        await RollupOrderStatusAsync(orderId);
    }

    /// <summary>
    /// Creates a Bosta delivery + Shipment row for one store order, credits the seller wallet,
    /// and notifies both parties. Bosta is REQUIRED — if it isn't connected or the API call fails,
    /// this throws (no synthetic/fake tracking): a shipment only ever reflects a real Bosta delivery.
    /// </summary>
    public async Task<Shipment> CreateShipmentForStoreOrderAsync(Order order, StoreOrder so)
    {
        if (so.Shipment is not null) return so.Shipment;

        // Shipping was priced at checkout (one Bosta fee per seller). Fall back to the configured
        // flat fee for store orders created outside the standard checkout.
        var shippingCost = so.ShippingTotal > 0m ? so.ShippingTotal : _fees.DefaultShipping;
        var isCod = string.Equals(so.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase);
        var codAmount = isCod ? so.Total : 0m;
        var size = ResolveSize(so);

        // Bosta must be connected. No fake fallback — if shipping can't be booked, error loudly.
        if (!_bosta.IsConfigured)
            throw new AppException(
                "Bosta is not connected — the shipment cannot be created.", 503, "BOSTA_NOT_CONNECTED");

        string? trackingNumber;
        string? bostaDeliveryId;
        try
        {
            var payload = await BuildDeliveryPayloadAsync(order, so, codAmount, size);
            var resp = await _bosta.CreateDeliveryAsync(payload);
            (trackingNumber, bostaDeliveryId) = ReadDeliveryIds(resp);
        }
        catch (AppException) { throw; }
        catch (Exception ex)
        {
            _log.LogError(ex, "Bosta create-delivery failed for store order {StoreOrderId}", so.StoreOrderid);
            throw new AppException(
                "Bosta create-delivery failed — the shipment was not created.", 502, "BOSTA_DELIVERY_FAILED");
        }

        if (string.IsNullOrWhiteSpace(trackingNumber))
            throw new AppException(
                "Bosta did not return a tracking number — the shipment was not created.", 502, "BOSTA_NO_TRACKING");

        var shipment = new Shipment
        {
            Carrier = "BOSTA",
            StoreOrderid = so.StoreOrderid,
            TrackingNumber = trackingNumber,
            BostaDeliveryId = bostaDeliveryId,
            ShippingCost = shippingCost,
            CodAmount = codAmount,
            Size = size,
            ShipmentStatus = 0, // CREATED
            StatusText = "CREATED",
        };
        _db.Shipments.Add(shipment);
        await _db.SaveChangesAsync();
        so.Shipment = shipment;

        AddEvent(shipment, "CREATED", "Order confirmed — Bosta pickup requested from the seller.");
        so.Status = "PROCESSING";
        so.ShippingTotal = shippingCost;
        so.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Wallet: credit the sale (PENDING), then debit Manzili commission (10% custom / 15%
        // standard) + the seller's 75% share of the Bosta fee. Net = sale − commission − sellerShip.
        var isCustom = await _db.CustomizedOrders.AnyAsync(c => c.Orderid == so.Orderid);
        var commission = _fees.Commission(so.Total, isCustom);
        var sellerShippingShare = _fees.SellerShip(shippingCost);
        await _wallet.CreditSaleAsync(so.Sellerid, so.StoreOrderid, so.Total, commission, sellerShippingShare);

        // Notify the seller to prepare the item, and the buyer that tracking is live.
        await _notify.NotifySellerAsync(so.Sellerid, "New paid order",
            $"Order #{so.StoreOrderid} is paid. Please prepare the item — Bosta will collect it from your "
            + $"pickup address and deliver it to the customer (tracking {trackingNumber}).",
            "order", "/store/orders");

        if (order.Enduserid is int enduserId)
            await _notify.NotifyEnduserAsync(enduserId, "Order confirmed",
                $"Your order is confirmed and being prepared. Track your Bosta delivery with {trackingNumber}.",
                "order", "/orders");

        return shipment;
    }

    // ===================== Status transitions =====================

    /// <summary>
    /// Moves a store order to a canonical status (PROCESSING/SHIPPED/DELIVERED/CANCELED), driving
    /// the shipment, wallet, notifications and order rollup. Shared by the seller status dropdown
    /// and (mapped) the Bosta webhook. <paramref name="actorSellerId"/> enforces ownership when a
    /// seller initiates it; pass null for system/webhook callers.
    /// </summary>
    public async Task<string> TransitionStoreOrderStatusAsync(int storeOrderId, string newStatus, int? actorSellerId)
    {
        var so = await _db.StoreOrders
            .Include(s => s.StoreOrderItems)
            .Include(s => s.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .Include(s => s.Order).ThenInclude(o => o.Address)
            .FirstOrDefaultAsync(s => s.StoreOrderid == storeOrderId)
            ?? throw new NotFoundException("Order");

        if (actorSellerId is int sid && so.Sellerid != sid)
            throw new ForbiddenException("Not your order");

        var status = NormalizeStatus(newStatus);
        var now = DateTime.UtcNow;

        // Lazily ensure a shipment exists before any shipping transition. Paid (Stripe)
        // orders qualify; COD orders also qualify even though they aren't paid yet — the
        // courier collects the cash on delivery (CreateShipment sets the COD amount and
        // credits the seller wallet as Pending, exactly like a paid order).
        var isCodOrder = string.Equals(so.PaymentMethod, "COD", StringComparison.OrdinalIgnoreCase);
        if (status is "PROCESSING" or "SHIPPED" or "DELIVERED" && so.Shipment is null && (so.IsPaid || isCodOrder))
            await CreateShipmentForStoreOrderAsync(so.Order, so);

        switch (status)
        {
            case "PROCESSING":
                so.Status = "PROCESSING";
                break;

            case "SHIPPED":
                so.Status = "SHIPPED";
                if (so.Shipment is Shipment shipped)
                {
                    shipped.ShipmentStatus = 2; // IN_TRANSIT
                    shipped.StatusText = "IN_TRANSIT";
                    shipped.ShippedAtTime = now;
                    AddEvent(shipped, "PICKED_UP", "Picked up by Bosta — your order is on the way.");
                }
                if (so.Order?.Enduserid is int e1)
                    await _notify.NotifyEnduserAsync(e1, "Order shipped",
                        $"Order #{so.StoreOrderid} was picked up by Bosta and is in transit.", "order", "/orders");
                break;

            case "DELIVERED":
                so.Status = "DELIVERED";
                // COD: the courier collected the cash on delivery → the order is now paid.
                if (!so.IsPaid && isCodOrder)
                {
                    so.IsPaid = true;
                    if (so.Order is not null && so.Order.IsPaid != true) so.Order.IsPaid = true;
                }
                if (so.Shipment is Shipment delivered)
                {
                    delivered.ShipmentStatus = 3; // DELIVERED
                    delivered.StatusText = "DELIVERED";
                    delivered.DeliveredAtTime = DateOnly.FromDateTime(now);
                    AddEvent(delivered, "DELIVERED", "Delivered to the customer.");
                }
                // Release seller funds (for COD this is the settlement step) and unlock the review.
                await _wallet.ReleaseStoreOrderFundsAsync(so.Sellerid, so.StoreOrderid);
                if (so.Order?.Enduserid is int e2)
                    await _notify.NotifyEnduserAsync(e2, "Order delivered",
                        $"Order #{so.StoreOrderid} was delivered. You can now leave a review for your purchase!",
                        "order", "/orders");
                break;

            case "CANCELED":
                so.Status = "CANCELED";
                if (so.Shipment is Shipment canceled)
                {
                    canceled.ShipmentStatus = 5; // CANCELED
                    canceled.StatusText = "CANCELED";
                    AddEvent(canceled, "CANCELED", "Shipment canceled.");
                }
                break;

            default:
                so.Status = status;
                break;
        }

        so.UpdatedAt = now;
        await _db.SaveChangesAsync();
        await RollupOrderStatusAsync(so.Orderid);
        return so.Status;
    }

    /// <summary>
    /// DEV-ONLY demo helper: advances the buyer's own store order ONE step along the lifecycle
    /// (ORDER_PLACED/PROCESSING → SHIPPED → DELIVERED), reusing <see cref="TransitionStoreOrderStatusAsync"/>
    /// so wallet release + notifications fire exactly as the Bosta webhook would. If the order is
    /// already DELIVERED (or terminal: CANCELED/RETURNED) it is left untouched and the current status
    /// is returned. <paramref name="buyerPersonId"/> is verified to own the store order.
    /// </summary>
    public async Task<string> SimulateAdvanceStoreOrderAsync(int buyerPersonId, int storeOrderId)
    {
        var enduserId = await _db.Endusers.AsNoTracking()
            .Where(e => e.Personid == buyerPersonId)
            .Select(e => (int?)e.Enduserid)
            .FirstOrDefaultAsync();

        var so = await _db.StoreOrders.AsNoTracking()
            .Where(s => s.StoreOrderid == storeOrderId)
            .Select(s => new { s.StoreOrderid, s.Status, OwnerEnduserId = s.Order.Enduserid })
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("Order");

        if (enduserId is null || so.OwnerEnduserId != enduserId)
            throw new ForbiddenException("Not your order");

        var current = NormalizeStatus(so.Status ?? "");
        var next = current switch
        {
            "DELIVERED" or "CANCELED" or "RETURNED" => current,
            "SHIPPED" => "DELIVERED",
            _ => "SHIPPED", // PENDING_PAYMENT / ORDER_PLACED / PROCESSING → SHIPPED
        };

        if (next == current) return current; // already DELIVERED / terminal — no-op

        return await TransitionStoreOrderStatusAsync(storeOrderId, next, actorSellerId: null);
    }

    // ===================== Returns (reverse logistics) =====================

    /// <summary>
    /// Buyer-initiated return. The buyer passes their <b>order</b> id; we resolve the eligible
    /// (delivered) store order(s), validate ownership, mark them RETURNED, book a Bosta reverse
    /// delivery (pickup = buyer, drop-off = seller), reverse the seller wallet credit, and notify
    /// the seller. Returns the first processed store order's result.
    /// </summary>
    public async Task<(int ReturnId, decimal RefundAmount, string TrackingNumber)> RequestReturnForOrderAsync(
        int personId, int orderId, string? reason)
    {
        var order = await _db.Orders
            .Include(o => o.Enduser)
            .Include(o => o.Address)
            .Include(o => o.StoreOrders).ThenInclude(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .FirstOrDefaultAsync(o => o.Orderid == orderId)
            // The buyer UI may also pass a store-order id directly — fall back to that.
            ?? await ResolveOrderByStoreOrderAsync(orderId);

        if (order is null) throw new NotFoundException("Order");
        if ((order.Enduser?.Personid ?? 0) != personId) throw new ForbiddenException("Not your order");

        var eligible = order.StoreOrders.Where(so => so.Status == "DELIVERED").ToList();
        if (eligible.Count == 0)
        {
            if (order.StoreOrders.Any(so => so.Status == "RETURNED"))
                throw new ConflictException("This order has already been returned");
            throw new ValidationAppException("Only delivered orders can be returned");
        }

        var cleanReason = string.IsNullOrWhiteSpace(reason) ? "Return requested by customer" : reason!;
        (int ReturnId, decimal RefundAmount, string TrackingNumber)? first = null;

        foreach (var so in eligible)
        {
            var result = await ReturnStoreOrderAsync(order, so, cleanReason);
            first ??= result;
        }

        await RollupOrderStatusAsync(order.Orderid);
        return first!.Value;
    }

    private async Task<Order?> ResolveOrderByStoreOrderAsync(int storeOrderId)
    {
        var orderId = await _db.StoreOrders.AsNoTracking()
            .Where(so => so.StoreOrderid == storeOrderId)
            .Select(so => (int?)so.Orderid)
            .FirstOrDefaultAsync();
        if (orderId is null) return null;
        return await _db.Orders
            .Include(o => o.Enduser)
            .Include(o => o.Address)
            .Include(o => o.StoreOrders).ThenInclude(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .FirstOrDefaultAsync(o => o.Orderid == orderId.Value);
    }

    private async Task<(int ReturnId, decimal RefundAmount, string TrackingNumber)> ReturnStoreOrderAsync(
        Order order, StoreOrder so, string reason)
    {
        // A return now needs ADMIN approval before any reverse logistics / refund / wallet reversal
        // happen. We only record the request (PENDING_APPROVAL), flag the store order, mark the
        // shipment as awaiting return approval, and notify the seller. The downstream actions run
        // later in ApproveReturnAsync.
        so.Status = "RETURNED";
        so.UpdatedAt = DateTime.UtcNow;

        if (so.Shipment is Shipment sh)
        {
            sh.StatusText = "RETURN_REQUESTED";
            AddEvent(sh, "RETURN_REQUESTED",
                $"Return requested by the customer — awaiting Manzili approval. Reason: {reason}");
        }

        var returnRecord = new Return
        {
            Orderid = so.Orderid,
            StoreOrderid = so.StoreOrderid,
            Reason = reason,
            Status = StatusMaps.ReturnStatusCode.PendingApproval,
            RefundAmount = so.Total,
            Requestdate = DateTime.UtcNow,
        };
        _db.Returns.Add(returnRecord);
        await _db.SaveChangesAsync();

        await _notify.NotifySellerAsync(so.Sellerid, "Return requested",
            $"The customer requested a return for order #{so.StoreOrderid}. It is pending Manzili review — "
            + "no refund or wallet adjustment happens until an administrator approves it.",
            "return", "/store/returns");

        // No tracking number yet — the reverse Bosta delivery is booked on approval.
        return (returnRecord.Returnid, so.Total, "");
    }

    // ===================== Admin return approval =====================

    /// <summary>
    /// Approves a pending return: books the Bosta reverse pickup (buyer → seller, with a synthetic
    /// fallback), reverses the seller's wallet credit (the refund), flags the shipment as in
    /// reverse transit, and notifies the seller. Idempotent — a return that is already APPROVED is
    /// returned unchanged. Throws if the return is not PENDING_APPROVAL.
    /// </summary>
    public async Task<(int ReturnId, string Status, decimal RefundAmount, string TrackingNumber)> ApproveReturnAsync(int returnId)
    {
        var ret = await _db.Returns.FirstOrDefaultAsync(r => r.Returnid == returnId)
            ?? throw new NotFoundException("Return");

        if (ret.Status == StatusMaps.ReturnStatusCode.Approved)
            return (ret.Returnid, "APPROVED", ret.RefundAmount ?? 0m, "");
        if (ret.Status == StatusMaps.ReturnStatusCode.Rejected)
            throw new ConflictException("This return has already been rejected");

        if (ret.StoreOrderid is not int storeOrderId)
            throw new ValidationAppException("Return is not linked to a store order");

        var so = await _db.StoreOrders
            .Include(s => s.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .FirstOrDefaultAsync(s => s.StoreOrderid == storeOrderId)
            ?? throw new NotFoundException("Store order");

        // Book the Bosta reverse delivery (pickup from the buyer, drop-off at the seller pickup
        // address). Bosta is REQUIRED — no synthetic fallback; error if it can't be booked.
        if (!_bosta.IsConfigured)
            throw new AppException(
                "Bosta is not connected — the return pickup cannot be booked.", 503, "BOSTA_NOT_CONNECTED");

        string? reverseTracking;
        try
        {
            var payload = await BuildReverseDeliveryPayloadAsync(so);
            var resp = await _bosta.CreateDeliveryAsync(payload);
            (reverseTracking, _) = ReadDeliveryIds(resp);
        }
        catch (AppException) { throw; }
        catch (Exception ex)
        {
            _log.LogError(ex, "Bosta reverse-delivery failed for store order {StoreOrderId}", so.StoreOrderid);
            throw new AppException(
                "Bosta reverse-delivery failed — the return pickup was not booked.", 502, "BOSTA_REVERSE_FAILED");
        }

        if (string.IsNullOrWhiteSpace(reverseTracking))
            throw new AppException(
                "Bosta did not return a return tracking number.", 502, "BOSTA_NO_TRACKING");

        so.Status = "RETURNED";
        so.UpdatedAt = DateTime.UtcNow;
        if (so.Shipment is Shipment sh)
        {
            sh.ShipmentStatus = 6; // return-in-progress (kept simple for the demo)
            sh.StatusText = "RETURN_IN_TRANSIT";
            AddEvent(sh, "RETURN_APPROVED",
                $"Return approved — Bosta will collect the item from the customer (return tracking {reverseTracking}).");
        }

        ret.Status = StatusMaps.ReturnStatusCode.Approved;
        await _db.SaveChangesAsync();

        // Refund: reverse the seller credit, then notify the seller.
        await _wallet.ReverseStoreOrderFundsAsync(so.Sellerid, so.StoreOrderid);
        await _notify.NotifySellerAsync(so.Sellerid, "Return approved",
            $"Manzili approved the return for order #{so.StoreOrderid}. Bosta will bring the item back to your "
            + $"pickup address (return tracking {reverseTracking}) and your wallet has been adjusted.",
            "return", "/store/returns");

        await RollupOrderStatusAsync(so.Orderid);
        return (ret.Returnid, "APPROVED", so.Total, reverseTracking);
    }

    /// <summary>
    /// Rejects a pending return: no Bosta pickup, no refund, no wallet reversal. The store order is
    /// restored to DELIVERED (the state it was in before the request) so the sale stands. Idempotent.
    /// </summary>
    public async Task<(int ReturnId, string Status)> RejectReturnAsync(int returnId, string? note)
    {
        var ret = await _db.Returns.FirstOrDefaultAsync(r => r.Returnid == returnId)
            ?? throw new NotFoundException("Return");

        if (ret.Status == StatusMaps.ReturnStatusCode.Rejected)
            return (ret.Returnid, "REJECTED");
        if (ret.Status == StatusMaps.ReturnStatusCode.Approved)
            throw new ConflictException("This return has already been approved");

        ret.Status = StatusMaps.ReturnStatusCode.Rejected;

        if (ret.StoreOrderid is int storeOrderId)
        {
            var so = await _db.StoreOrders
                .Include(s => s.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
                .FirstOrDefaultAsync(s => s.StoreOrderid == storeOrderId);
            if (so is not null)
            {
                // Roll the store order back to delivered — the return was declined, the sale stands.
                so.Status = "DELIVERED";
                so.UpdatedAt = DateTime.UtcNow;
                if (so.Shipment is Shipment sh)
                {
                    sh.ShipmentStatus = 3; // DELIVERED
                    sh.StatusText = "DELIVERED";
                    AddEvent(sh, "RETURN_REJECTED",
                        string.IsNullOrWhiteSpace(note)
                            ? "Return request rejected by Manzili — the order remains delivered."
                            : $"Return request rejected by Manzili: {note}");
                }
                await _db.SaveChangesAsync();
                await RollupOrderStatusAsync(so.Orderid);
                return (ret.Returnid, "REJECTED");
            }
        }

        await _db.SaveChangesAsync();
        return (ret.Returnid, "REJECTED");
    }

    // ===================== Custom orders =====================

    /// <summary>
    /// Converts a fully-paid custom offer into a real order + store order (with a hidden, disabled
    /// placeholder product for the bespoke item) and fulfills it through the same pipeline, so the
    /// custom piece shows up with Bosta tracking on both the buyer's and seller's order pages.
    /// Idempotent via the order's transaction reference ("offer_{id}").
    /// </summary>
    public async Task CreateCustomOrderForOfferAsync(int offerId)
    {
        var marker = $"offer_{offerId}";
        if (await _db.Orders.AnyAsync(o => o.TransactionRef == marker)) return;

        var offer = await _db.Offers
            .Include(o => o.Request).ThenInclude(r => r!.Enduser)
            .Include(o => o.OfferPayments)
            .FirstOrDefaultAsync(o => o.OfferId == offerId);
        if (offer?.Request is null) return;

        var request = offer.Request;
        var addressId = offer.OfferPayments
            .OrderByDescending(p => p.PaidAt)
            .Select(p => p.AddressId)
            .FirstOrDefault(a => a is not null);

        // Hidden placeholder product so the FK-required store_order_item can reference it.
        var product = new Product
        {
            Productname = request.Itemname,
            Description = request.Description,
            Price = offer.Price,
            Stock = 0,
            InStock = false,
            IsDisabled = true, // never shown in the storefront — it's a one-off custom piece
            Sellerid = offer.Sellerid,
            Categoryid = request.Categoryid,
            CoverUrl = SafeImageUrl(request.ImageUrls?.FirstOrDefault()),
            ShippingSize = "MEDIUM",
            ShippingBulkyCategory = "NORMAL",
            CreatedAt = DateTime.UtcNow,
        };
        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        var order = new Order
        {
            Enduserid = request.Enduserid,
            Status = 1, // ORDER_PLACED
            Totalamount = offer.Price,
            Shippingcost = 0m,
            Paymentid = 0,
            Paymentmethod = 1, // STRIPE
            Paymentstatus = 1,
            PaidAt = DateTime.UtcNow,
            IsPaid = true,
            AddressId = addressId,
            Sellerid = offer.Sellerid,
            TransactionRef = marker,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        _db.CustomizedOrders.Add(new CustomizedOrder { Orderid = order.Orderid });

        var storeOrder = new StoreOrder
        {
            Orderid = order.Orderid,
            Sellerid = offer.Sellerid,
            Subtotal = offer.Price,
            DiscountTotal = 0m,
            ShippingTotal = _fees.DefaultShipping,
            Total = offer.Price,
            Status = "ORDER_PLACED",
            IsPaid = true,
            PaymentMethod = "STRIPE",
            CreatedAt = DateTime.UtcNow,
        };
        _db.StoreOrders.Add(storeOrder);
        await _db.SaveChangesAsync();

        _db.StoreOrderItems.Add(new StoreOrderItem
        {
            StoreOrderid = storeOrder.StoreOrderid,
            Productid = product.Productid,
            Quantity = request.Quantity ?? 1,
            PriceAtPurchase = offer.Price,
            ProductName = request.Itemname,
            ProductImageUrl = SafeImageUrl(request.ImageUrls?.FirstOrDefault()),
            ShippingSize = "MEDIUM",
            ShippingBulkyCat = "NORMAL",
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        await FulfillPaidOrderAsync(order.Orderid);
    }

    /// <summary>
    /// Guards the varchar(500) cover_url / product_image_url columns: custom-request images are stored
    /// as base64 <c>data:</c> URLs (many KB) in an unbounded array column, which overflow the 500-char
    /// product/order-item image columns and crash the insert (Npgsql 22001). We store null for those —
    /// the placeholder product is hidden anyway and the UI falls back to a placeholder image.
    /// </summary>
    private static string? SafeImageUrl(string? url) =>
        string.IsNullOrWhiteSpace(url) || url.StartsWith("data:", StringComparison.OrdinalIgnoreCase) || url.Length > 500
            ? null
            : url;

    // ===================== Helpers =====================

    private async Task RollupOrderStatusAsync(int orderId)
    {
        var statuses = await _db.StoreOrders
            .Where(so => so.Orderid == orderId)
            .Select(so => so.Status)
            .ToListAsync();
        if (statuses.Count == 0) return;

        bool All(string s) => statuses.All(x => x == s);
        bool Any(string s) => statuses.Any(x => x == s);

        short rolled =
            All("DELIVERED") ? (short)4 :
            All("CANCELED") ? (short)5 :
            All("RETURNED") ? (short)6 :
            Any("RETURNED") ? (short)6 :
            Any("SHIPPED") ? (short)3 :
            Any("PROCESSING") ? (short)2 :
            Any("PENDING_PAYMENT") ? (short)0 :
            (short)1; // ORDER_PLACED

        await _db.Orders
            .Where(o => o.Orderid == orderId)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, rolled));
    }

    private void AddEvent(Shipment shipment, string eventType, string message)
    {
        var payload = JsonSerializer.Serialize(new { message });
        var ev = new ShipmentEvent
        {
            Shipmentid = shipment.Shipmentid,
            EventType = eventType,
            RawPayload = payload,
            PayloadHash = Sha256Hex($"{eventType}|{message}|{DateTime.UtcNow.Ticks}"),
            OccurredAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        };
        _db.ShipmentEvents.Add(ev);
        shipment.ShipmentEvents?.Add(ev);
    }

    private async Task<object> BuildDeliveryPayloadAsync(Order order, StoreOrder so, decimal codAmount, string size)
    {
        var addr = order.Address;
        var pickup = await _db.StorePickupAddresses.AsNoTracking()
            .Where(p => p.Sellerid == so.Sellerid)
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.PickupId)
            .FirstOrDefaultAsync();
        var locationId = await _db.Sellers.AsNoTracking()
            .Where(s => s.Sellerid == so.Sellerid)
            .Select(s => s.BostaPickupLocationId)
            .FirstOrDefaultAsync();

        var payload = new Dictionary<string, object?>
        {
            ["type"] = 10, // SEND
            ["cod"] = (double)codAmount,
            ["specs"] = new Dictionary<string, object?>
            {
                ["size"] = size,
                ["packageType"] = "Parcel",
            },
            ["dropOffAddress"] = new Dictionary<string, object?>
            {
                ["city"] = addr?.City,
                ["zoneId"] = addr?.BostaZoneId,
                ["districtId"] = addr?.BostaDistrictId,
                ["firstLine"] = string.IsNullOrWhiteSpace(addr?.Street) ? "N/A" : addr!.Street,
                ["buildingNumber"] = addr?.Buildingnumber,
                ["floor"] = addr?.Floor,
                ["apartment"] = addr?.Apartmentnumber,
            },
            ["receiver"] = new Dictionary<string, object?>
            {
                ["firstName"] = FirstWord(addr?.Name) ?? "Customer",
                ["lastName"] = RestWords(addr?.Name) ?? ".",
                ["phone"] = addr?.Phone ?? "",
                ["email"] = addr?.Email,
            },
            ["businessReference"] = $"MZ-SO-{so.StoreOrderid}",
            ["notes"] = $"Manzili order {so.Orderid} / store order {so.StoreOrderid}",
        };

        if (!string.IsNullOrWhiteSpace(locationId)) payload["businessLocationId"] = locationId;
        if (!string.IsNullOrWhiteSpace(_bostaOptions.WebhookBaseUrl))
            payload["webhookUrl"] = $"{_bostaOptions.WebhookBaseUrl.TrimEnd('/')}/api/v1/webhooks/bosta";

        // Collect from (and, on failed delivery, return to) the seller's pickup address. With a
        // registered businessLocationId Bosta uses that location; pickupAddress covers sellers
        // that don't have one yet.
        if (pickup is not null)
        {
            var sellerAddr = new Dictionary<string, object?>
            {
                ["city"] = pickup.City,
                ["zoneId"] = pickup.BostaZoneId,
                ["districtId"] = pickup.BostaDistrictId,
                ["firstLine"] = pickup.FirstLine,
            };
            payload["pickupAddress"] = sellerAddr;
            payload["returnAddress"] = sellerAddr;
        }

        return payload;
    }

    /// <summary>Reverse-logistics payload: pickup from the buyer, drop-off at the seller pickup address.</summary>
    private async Task<object> BuildReverseDeliveryPayloadAsync(StoreOrder so)
    {
        var order = await _db.Orders.AsNoTracking().Include(o => o.Address)
            .FirstOrDefaultAsync(o => o.Orderid == so.Orderid);
        var addr = order?.Address;
        var pickup = await _db.StorePickupAddresses.AsNoTracking()
            .Where(p => p.Sellerid == so.Sellerid)
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.PickupId)
            .FirstOrDefaultAsync();

        return new Dictionary<string, object?>
        {
            ["type"] = 25, // RETURN / reverse pickup
            ["cod"] = 0,
            ["specs"] = new Dictionary<string, object?> { ["size"] = "MEDIUM", ["packageType"] = "Parcel" },
            // Collect from the customer …
            ["pickupAddress"] = new Dictionary<string, object?>
            {
                ["city"] = addr?.City,
                ["zoneId"] = addr?.BostaZoneId,
                ["districtId"] = addr?.BostaDistrictId,
                ["firstLine"] = string.IsNullOrWhiteSpace(addr?.Street) ? "N/A" : addr!.Street,
            },
            // … and bring it back to the seller.
            ["dropOffAddress"] = pickup is null ? null : new Dictionary<string, object?>
            {
                ["city"] = pickup.City,
                ["zoneId"] = pickup.BostaZoneId,
                ["districtId"] = pickup.BostaDistrictId,
                ["firstLine"] = pickup.FirstLine,
            },
            ["businessReference"] = $"MZ-RET-{so.StoreOrderid}",
            ["notes"] = $"Return for Manzili store order {so.StoreOrderid}",
        };
    }

    private static (string? Tracking, string? Id) ReadDeliveryIds(JsonElement? resp)
    {
        if (resp is not JsonElement root) return (null, null);
        var data = root.ValueKind == JsonValueKind.Object && root.TryGetProperty("data", out var d) ? d : root;
        var tracking = ReadStr(data, "trackingNumber") ?? ReadStr(root, "trackingNumber");
        var id = ReadStr(data, "_id") ?? ReadStr(root, "_id");
        return (tracking, id);
    }

    private static string? ReadStr(JsonElement el, string name) =>
        el.ValueKind == JsonValueKind.Object && el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static string ResolveSize(StoreOrder so)
    {
        var sizes = (so.StoreOrderItems ?? new List<StoreOrderItem>())
            .Select(i => (i.ShippingSize ?? "").ToUpperInvariant())
            .ToList();
        if (sizes.Any(s => s == "LARGE")) return "LARGE";
        if (sizes.Count > 0 && sizes.All(s => s == "SMALL")) return "SMALL";
        return "MEDIUM";
    }

    private static string NormalizeStatus(string status)
    {
        var s = (status ?? "").Trim();
        return s.ToLowerInvariant() switch
        {
            "pending" or "pending_payment" => "PENDING_PAYMENT",
            "placed" or "order_placed" => "ORDER_PLACED",
            "processing" or "preparing" => "PROCESSING",
            "shipped" or "in_transit" or "out_for_delivery" => "SHIPPED",
            "completed" or "delivered" => "DELIVERED",
            "cancelled" or "canceled" => "CANCELED",
            "returned" => "RETURNED",
            _ => s.ToUpperInvariant(),
        };
    }

    private static string? FirstWord(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 0 ? parts[0] : null;
    }

    private static string? RestWords(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var parts = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 1 ? string.Join(" ", parts.Skip(1)) : null;
    }

    private static string Sha256Hex(string input) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input))).ToLowerInvariant();
}
