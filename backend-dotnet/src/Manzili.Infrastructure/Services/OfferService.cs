using Manzili.Application.Common;
using Manzili.Application.Custom;
using Manzili.Infrastructure.Persistence;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Port of the offer-facing parts of Node services/customRequest.service.js:
/// listOffers, getActiveOffer, getOfferMessages, sendOfferMessage.
/// </summary>
public sealed class OfferService
{
    private readonly ManziliDbContext _db;
    private readonly FulfillmentService _fulfillment;

    public OfferService(ManziliDbContext db, FulfillmentService fulfillment)
    {
        _db = db;
        _fulfillment = fulfillment;
    }

    private static readonly string[] ActiveStatuses =
        ["accepted", "first_paid", "progress_uploaded", "second_paid", "ready_to_ship", "paid"];

    // ---------- Offers ----------

    /// <summary>All offers for a request, newest first.</summary>
    public async Task<(IReadOnlyList<OfferDto> Offers, int Total)> ListOffersAsync(int requestId)
    {
        var offers = await _db.Offers.AsNoTracking()
            .Include(o => o.Seller)
            .Include(o => o.OfferPayments).ThenInclude(p => p.Address)
            .Where(o => o.Requestid == requestId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var dtos = offers.Select(MapOffer).ToList();
        await EnrichWithTrackingAsync(dtos);
        return (dtos, dtos.Count);
    }

    /// <summary>The currently-active offer for a request (most recently updated), or null.</summary>
    public async Task<OfferDto?> GetActiveOfferAsync(int requestId)
    {
        var offer = await _db.Offers.AsNoTracking()
            .Include(o => o.Seller)
            .Include(o => o.OfferPayments).ThenInclude(p => p.Address)
            .Where(o => o.Requestid == requestId && ActiveStatuses.Contains(o.Status))
            .OrderByDescending(o => o.UpdatedAt)
            .FirstOrDefaultAsync();

        if (offer is null) return null;
        var dto = MapOffer(offer);
        await EnrichWithTrackingAsync(new[] { dto });
        return dto;
    }

    // ---------- Offer messages ----------

    public async Task<IReadOnlyList<OfferMessageDto>> GetOfferMessagesAsync(int offerId)
    {
        var messages = await _db.OfferMessages.AsNoTracking()
            .Where(m => m.OfferId == offerId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        return messages.Select(m => new OfferMessageDto
        {
            Id = m.MessageId.ToString(),
            Author = m.AuthorType,
            Text = m.Text,
            Image = m.ImageUrl,
            CreatedAt = FormatDateTime(m.CreatedAt),
        }).ToList();
    }

    public async Task<OfferMessageDto> SendOfferMessageAsync(int personId, int offerId, SendOfferMessageRequest body)
    {
        var offer = await _db.Offers.AsNoTracking().FirstOrDefaultAsync(o => o.OfferId == offerId)
            ?? throw new NotFoundException("Offer");

        // Author is "seller" only when the sender owns the offer's seller account.
        var seller = await _db.Sellers.AsNoTracking().FirstOrDefaultAsync(s => s.Personid == personId);
        var authorType = seller is not null && seller.Sellerid == offer.Sellerid ? "seller" : "buyer";

        var message = new OfferMessage
        {
            OfferId = offerId,
            AuthorType = authorType,
            AuthorId = personId,
            Text = body.Text ?? "",
            ImageUrl = string.IsNullOrWhiteSpace(body.Image) ? null : body.Image,
            CreatedAt = DateTime.UtcNow,
        };

        _db.OfferMessages.Add(message);
        await _db.SaveChangesAsync();

        return new OfferMessageDto
        {
            Id = message.MessageId.ToString(),
            Author = message.AuthorType,
            Text = message.Text,
            Image = message.ImageUrl,
            CreatedAt = FormatDateTime(message.CreatedAt),
        };
    }

    // ---------- Offer lifecycle ----------

    /// <summary>Seller submits a new offer on a custom request.</summary>
    public async Task<OfferDto> SubmitOfferAsync(int sellerId, int requestId, SubmitOfferRequest body)
    {
        var request = await _db.CustomRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Requestid == requestId)
            ?? throw new NotFoundException("Request");

        var offer = new Offer
        {
            Requestid = request.Requestid,
            Sellerid = sellerId,
            Price = body.Price,
            Status = "pending",
            SellerComment = string.IsNullOrWhiteSpace(body.Comment) ? null : body.Comment,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Offers.Add(offer);
        await _db.SaveChangesAsync();

        return await GetOfferDtoAsync(offer.OfferId);
    }

    /// <summary>
    /// Apply a lifecycle transition. Buyer (request owner) may accept/decline/block;
    /// the offer's seller may mark progress/ready. Sets the matching timestamp column.
    /// </summary>
    public async Task<OfferDto> ApplyActionAsync(int personId, int offerId, OfferActionRequest body)
    {
        var offer = await _db.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId)
            ?? throw new NotFoundException("Offer");

        var (isOwner, isOfferSeller) = await ResolveRolesAsync(personId, offer);
        var now = DateTime.UtcNow;

        switch (body.Action)
        {
            case "accept":
                RequireBuyer(isOwner);
                offer.Status = "accepted";
                offer.AcceptedAt = now;
                // Accepting one offer supersedes the request's other pending offers.
                var siblings = await _db.Offers
                    .Where(o => o.Requestid == offer.Requestid && o.OfferId != offer.OfferId && o.Status == "pending")
                    .ToListAsync();
                foreach (var s in siblings) { s.Status = "superseded"; s.UpdatedAt = now; }
                break;
            case "decline":
                RequireBuyer(isOwner);
                offer.Status = "declined";
                break;
            case "block":
                RequireBuyer(isOwner);
                offer.Status = "blocked";
                break;
            case "progress":
                RequireOfferSeller(isOfferSeller);
                offer.Status = "progress_uploaded";
                offer.ProgressUploadedAt = now;
                break;
            case "ready":
                RequireOfferSeller(isOfferSeller);
                offer.Status = "ready_to_ship";
                offer.ReadyToShipAt = now;
                break;
            default:
                throw new ValidationAppException(new[]
                {
                    new { path = "action", message = "Unsupported action" }
                });
        }

        if (!string.IsNullOrWhiteSpace(body.Comment))
        {
            if (isOfferSeller) offer.SellerComment = body.Comment;
            else offer.BuyerComment = body.Comment;
        }

        offer.UpdatedAt = now;
        await _db.SaveChangesAsync();

        return await GetOfferDtoAsync(offer.OfferId);
    }

    /// <summary>
    /// Server-trusted amount for a milestone, mirroring the client schedule (getMilestoneSchedule):
    /// offers over 1000 EGP split into thirds (first = second = price/3, final = remainder); cheaper
    /// offers split into halves (first = price/2, final = remainder; no "second"). The client-sent
    /// amount is advisory only — the server always records/charges the correct split so a tampered
    /// request can't underpay a milestone.
    /// </summary>
    public static decimal ResolveMilestoneAmount(decimal price, string? milestone)
    {
        static decimal R(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
        if (price > 1000m)
        {
            var third = R(price / 3m);
            return milestone switch { "first" => third, "second" => third, _ => price - 2 * third };
        }
        var half = R(price / 2m);
        return milestone == "first" ? half : price - half;
    }

    /// <summary>Record a milestone payment and advance the offer's milestone timestamp.</summary>
    public async Task<OfferDto> AddPaymentAsync(int personId, int offerId, OfferPaymentRequest body)
    {
        var offer = await _db.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId)
            ?? throw new NotFoundException("Offer");

        int? addressId = null;
        if (!string.IsNullOrWhiteSpace(body.AddressId) && int.TryParse(body.AddressId, out var aid))
        {
            var exists = await _db.Addresses.AsNoTracking().AnyAsync(a => a.Id == aid);
            if (!exists) throw new NotFoundException("Address");
            addressId = aid;
        }

        var now = DateTime.UtcNow;

        var payment = new OfferPayment
        {
            OfferId = offer.OfferId,
            Milestone = body.Milestone!,
            Amount = ResolveMilestoneAmount(offer.Price, body.Milestone), // server-trusted split, not the client's number
            PaymentMethod = body.PaymentMethod!,
            AddressId = addressId,
            PaidAt = now,
        };
        _db.OfferPayments.Add(payment);

        switch (body.Milestone)
        {
            case "first":
                offer.FirstPaidAt = now;
                offer.Status = "first_paid";
                break;
            case "second":
                offer.SecondPaidAt = now;
                offer.Status = "second_paid";
                break;
            case "final":
                offer.PaidAt = now;
                offer.Status = "paid";
                break;
            default:
                throw new ValidationAppException(new[]
                {
                    new { path = "milestone", message = "milestone must be one of: first, second, final" }
                });
        }

        offer.UpdatedAt = now;
        await _db.SaveChangesAsync();

        // Paying the final milestone turns the accepted offer into a real, trackable order
        // (same Bosta/wallet/notification pipeline as a standard checkout).
        if (body.Milestone == "final")
            await _fulfillment.CreateCustomOrderForOfferAsync(offer.OfferId);

        return await GetOfferDtoAsync(offer.OfferId);
    }

    /// <summary>
    /// Records a milestone payment that was completed via a Stripe portal (no per-request auth —
    /// called from the webhook / confirm path). Idempotent per (offer, milestone).
    /// </summary>
    public async Task RecordPaidMilestoneAsync(int offerId, string milestone, decimal amount, int? addressId)
    {
        var offer = await _db.Offers.FirstOrDefaultAsync(o => o.OfferId == offerId);
        if (offer is null) return;

        var already = await _db.OfferPayments.AnyAsync(p => p.OfferId == offerId && p.Milestone == milestone);
        if (already)
        {
            // Ensure the order exists even if the payment row was already written.
            if (milestone == "final") await _fulfillment.CreateCustomOrderForOfferAsync(offerId);
            return;
        }

        var now = DateTime.UtcNow;
        _db.OfferPayments.Add(new OfferPayment
        {
            OfferId = offerId,
            Milestone = milestone,
            Amount = ResolveMilestoneAmount(offer.Price, milestone), // server-trusted split, ignore the passed amount
            PaymentMethod = "STRIPE",
            AddressId = addressId,
            PaidAt = now,
        });

        switch (milestone)
        {
            case "first": offer.FirstPaidAt = now; offer.Status = "first_paid"; break;
            case "second": offer.SecondPaidAt = now; offer.Status = "second_paid"; break;
            default: offer.PaidAt = now; offer.Status = "paid"; break;
        }
        offer.UpdatedAt = now;
        await _db.SaveChangesAsync();

        if (milestone == "final" || milestone is not ("first" or "second"))
            await _fulfillment.CreateCustomOrderForOfferAsync(offerId);
    }

    // ---------- Role resolution ----------

    /// <summary>(isRequestOwner, isOfferSeller) for the given person relative to the offer.</summary>
    private async Task<(bool IsOwner, bool IsOfferSeller)> ResolveRolesAsync(int personId, Offer offer)
    {
        var seller = await _db.Sellers.AsNoTracking().FirstOrDefaultAsync(s => s.Personid == personId);
        var isOfferSeller = seller is not null && seller.Sellerid == offer.Sellerid;

        var ownerPersonId = await _db.CustomRequests.AsNoTracking()
            .Where(r => r.Requestid == offer.Requestid)
            .Join(_db.Endusers.AsNoTracking(), r => r.Enduserid, e => e.Enduserid, (r, e) => e.Personid)
            .FirstOrDefaultAsync();
        var isOwner = ownerPersonId != 0 && ownerPersonId == personId;

        return (isOwner, isOfferSeller);
    }

    private static void RequireBuyer(bool isOwner)
    {
        if (!isOwner) throw new ForbiddenException("Only the request owner can perform this action");
    }

    private static void RequireOfferSeller(bool isOfferSeller)
    {
        if (!isOfferSeller) throw new ForbiddenException("Only the offering seller can perform this action");
    }

    /// <summary>Reload an offer with its includes and map to the DTO shape used by the GET endpoints.</summary>
    private async Task<OfferDto> GetOfferDtoAsync(int offerId)
    {
        var offer = await _db.Offers.AsNoTracking()
            .Include(o => o.Seller)
            .Include(o => o.OfferPayments).ThenInclude(p => p.Address)
            .FirstAsync(o => o.OfferId == offerId);
        var dto = MapOffer(offer);
        await EnrichWithTrackingAsync(new[] { dto });
        return dto;
    }

    // ---------- Custom-order tracking enrichment ----------

    /// <summary>
    /// For each offer DTO, looks up the real order that the final-milestone payment created
    /// (Order.TransactionRef == "offer_{id}") and attaches its Bosta shipment timeline, the
    /// created order id, the placeholder product id (so the buyer can review the custom piece),
    /// and a derived <c>delivered</c> flag. Offers without a created order are left untouched
    /// (orderId/productId/shipment stay null, delivered stays false). One round-trip for the
    /// whole batch keyed on the "offer_{id}" transaction refs.
    /// </summary>
    private async Task EnrichWithTrackingAsync(IReadOnlyCollection<OfferDto> dtos)
    {
        if (dtos.Count == 0) return;

        // Map each transaction ref ("offer_{id}") back to the offer id so we can fan the result out.
        var refToOfferId = dtos
            .Where(d => int.TryParse(d.Id, out _))
            .ToDictionary(d => $"offer_{d.Id}", d => d.Id);
        if (refToOfferId.Count == 0) return;

        var refs = refToOfferId.Keys.ToList();
        var orders = await _db.Orders.AsNoTracking()
            .Where(o => o.TransactionRef != null && refs.Contains(o.TransactionRef))
            .Include(o => o.StoreOrders).ThenInclude(so => so.Shipment!).ThenInclude(sh => sh.ShipmentEvents)
            .Include(o => o.StoreOrders).ThenInclude(so => so.StoreOrderItems)
            .ToListAsync();
        if (orders.Count == 0) return;

        var byOfferId = orders
            .Where(o => o.TransactionRef != null && refToOfferId.ContainsKey(o.TransactionRef))
            .ToDictionary(o => refToOfferId[o.TransactionRef!], o => o);

        foreach (var dto in dtos)
        {
            if (!byOfferId.TryGetValue(dto.Id, out var order)) continue;

            dto.OrderId = order.Orderid.ToString();

            // The custom order has exactly one store order (created in CreateCustomOrderForOfferAsync).
            var so = order.StoreOrders.FirstOrDefault();
            if (so is not null) dto.StoreOrderId = so.StoreOrderid.ToString();
            var productId = so?.StoreOrderItems.FirstOrDefault()?.Productid;
            if (productId is int pid) dto.ProductId = pid.ToString();

            if (so?.Shipment is Shipment shipment)
            {
                var shipmentDto = ShipmentMapper.Map(shipment);
                dto.Shipment = shipmentDto;
                dto.Delivered = string.Equals(shipmentDto.Status, "DELIVERED", StringComparison.OrdinalIgnoreCase);
            }
        }
    }

    // ---------- Mapping ----------

    private static OfferDto MapOffer(Offer o)
    {
        var comments = new List<OfferCommentDto>();
        if (!string.IsNullOrWhiteSpace(o.BuyerComment))
            comments.Add(new OfferCommentDto
            {
                Id = $"{o.OfferId}-buyer",
                Author = "buyer",
                Text = o.BuyerComment,
                CreatedAt = FormatDateTime(o.CreatedAt),
            });
        if (!string.IsNullOrWhiteSpace(o.SellerComment))
            comments.Add(new OfferCommentDto
            {
                Id = $"{o.OfferId}-seller",
                Author = "seller",
                Text = o.SellerComment,
                CreatedAt = FormatDateTime(o.CreatedAt),
            });

        var payments = o.OfferPayments
            .OrderBy(p => p.PaidAt)
            .Select(p => new OfferPaymentDto
            {
                Id = p.PaymentId.ToString(),
                Milestone = p.Milestone,
                Amount = p.Amount,
                PaymentMethod = p.PaymentMethod,
                PaidAt = FormatDateTime(p.PaidAt),
            })
            .ToList();

        // Shipping address comes from the final-milestone payment's address, when present.
        var addr = o.OfferPayments
            .OrderByDescending(p => p.PaidAt)
            .Select(p => p.Address)
            .FirstOrDefault(a => a is not null);

        OfferShippingAddressDto? shipping = addr is null ? null : new OfferShippingAddressDto
        {
            Id = addr.Id.ToString(),
            Name = addr.Name,
            Phone = addr.Phone,
            City = addr.City,
            Street = addr.Street,
            BuildingNumber = addr.Buildingnumber,
            ApartmentNumber = addr.Apartmentnumber,
            ZipCode = addr.Zipcode ?? addr.Postalcode,
        };

        return new OfferDto
        {
            Id = o.OfferId.ToString(),
            RequestId = o.Requestid.ToString(),
            SellerId = o.Sellerid.ToString(),
            SellerName = o.Seller?.Storename ?? "",
            SellerLogo = o.Seller?.LogoUrl,
            Price = o.Price,
            DeliveryDate = null, // no offer-level delivery date column
            Status = o.Status,
            Comments = comments,
            Payments = payments,
            ShippingAddress = shipping,
            CreatedAt = FormatDateTime(o.CreatedAt),
            UpdatedAt = o.UpdatedAt is DateTime u ? FormatDateTime(u) : null,
            AcceptedAt = o.AcceptedAt is DateTime a2 ? FormatDateTime(a2) : null,
            FirstPaidAt = o.FirstPaidAt is DateTime f ? FormatDateTime(f) : null,
            ReadyToShipAt = o.ReadyToShipAt is DateTime r ? FormatDateTime(r) : null,
            PaidAt = o.PaidAt is DateTime p2 ? FormatDateTime(p2) : null,
        };
    }

    private static string FormatDateTime(DateTime value) =>
        value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
}
