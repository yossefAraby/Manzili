import {
  STORAGE_KEYS,
  makeEntityId,
  readStorageItems,
  writeStorageEnvelope,
} from "@/lib/storage/localStorageEnvelope";

/**
 * Custom-request offer lifecycle (single source of truth for the
 * negotiation UI on both sides):
 *
 *   pending        → seller sent a proposal, buyer hasn't decided
 *   declined       → buyer declined; seller may submit a fresh proposal
 *   blocked        → buyer blocked this seller for this request (terminal)
 *   accepted       → buyer accepted; chat opens, deadline countdown starts
 *   ready_to_ship  → seller marked the order ready; buyer must add
 *                    address & payment to finalize
 *   paid           → buyer completed payment/address step (terminal)
 *
 * Invariant: per requestId, at most ONE offer is in
 * {accepted, ready_to_ship, paid}. Accepting an offer auto-archives the
 * rest as `superseded`.
 *
 * Each offer also carries a `comments` array — a chronological history
 * of the seller's notes (with each proposal) and the buyer's replies
 * (with each decision). On accept, the request-view / negotiation pages
 * seed the chat with this history so the conversation feels continuous.
 *
 *   comments: [
 *     { id, author: 'seller'|'buyer', text, createdAt }
 *   ]
 */
export const OFFER_STATUS = Object.freeze({
  PENDING: "pending",
  DECLINED: "declined",
  BLOCKED: "blocked",
  ACCEPTED: "accepted",
  READY_TO_SHIP: "ready_to_ship",
  PAID: "paid",
  SUPERSEDED: "superseded",
});

const ACTIVE_DEAL_STATUSES = new Set([
  OFFER_STATUS.ACCEPTED,
  OFFER_STATUS.READY_TO_SHIP,
  OFFER_STATUS.PAID,
]);

function toDateValue(value) {
  return new Date(value || 0).getTime();
}

function makeComment(author, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  return {
    id: makeEntityId("cmt"),
    author, // 'seller' | 'buyer'
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
}

function appendComment(existing, comment) {
  if (!comment) return Array.isArray(existing) ? existing : [];
  const base = Array.isArray(existing) ? existing : [];
  return [...base, comment];
}

export async function listCustomRequests() {
  const list = readStorageItems(STORAGE_KEYS.CUSTOM_REQUESTS) || [];
  return [...list].sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt));
}

export async function getCustomRequestById(id) {
  const list = await listCustomRequests();
  return list.find((item) => item.id === id) ?? null;
}

export async function saveCustomRequest(request) {
  const list = readStorageItems(STORAGE_KEYS.CUSTOM_REQUESTS) || [];
  const now = new Date().toISOString();
  const id = request.id || makeEntityId("cr");
  const payload = {
    ...request,
    id,
    createdAt: request.createdAt || now,
    updatedAt: now,
  };

  const next = [payload, ...list.filter((item) => item.id !== id)];
  writeStorageEnvelope(STORAGE_KEYS.CUSTOM_REQUESTS, next);
  return payload;
}

// ---- offers ----------------------------------------------------------------

function readOffers() {
  return readStorageItems(STORAGE_KEYS.CUSTOM_REQUEST_OFFERS) || [];
}

function writeOffers(offers) {
  writeStorageEnvelope(STORAGE_KEYS.CUSTOM_REQUEST_OFFERS, offers);
}

export async function listOffersByRequestId(requestId) {
  const list = readOffers();
  return list
    .filter((item) => item.requestId === requestId)
    .sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt));
}

/** All offers a given seller has sent across requests. Used by /store/custom-order. */
export async function listOffersBySellerId(sellerId) {
  if (!sellerId) return [];
  const list = readOffers();
  return list
    .filter((item) => item.sellerId === sellerId)
    .sort((a, b) => toDateValue(b.updatedAt || b.createdAt) - toDateValue(a.updatedAt || a.createdAt));
}

export async function getLatestOfferForSeller(requestId, sellerId) {
  if (!requestId || !sellerId) return null;
  const list = await listOffersByRequestId(requestId);
  return list.find((o) => o.sellerId === sellerId) ?? null;
}

export async function getActiveDealOffer(requestId) {
  const list = await listOffersByRequestId(requestId);
  return list.find((o) => ACTIVE_DEAL_STATUSES.has(o.status)) ?? null;
}

export async function addOfferToRequest(requestId, offer) {
  const offers = readOffers();
  const now = new Date().toISOString();

  // Replace this seller's non-terminal offer (resend-after-decline path)
  // while carrying the comment history forward.
  const sellerId = offer.sellerId || null;
  const previousFromSameSeller = sellerId
    ? offers.find(
        (o) =>
          o.requestId === requestId &&
          o.sellerId === sellerId &&
          (o.status === OFFER_STATUS.PENDING || o.status === OFFER_STATUS.DECLINED),
      ) ?? null
    : null;

  const cleaned = sellerId
    ? offers.filter(
        (o) =>
          !(
            o.requestId === requestId &&
            o.sellerId === sellerId &&
            (o.status === OFFER_STATUS.PENDING || o.status === OFFER_STATUS.DECLINED)
          ),
      )
    : offers;

  const carriedComments = previousFromSameSeller?.comments || [];
  const newComment = makeComment("seller", offer.sellerComment);

  const payload = {
    id: makeEntityId("cro"),
    requestId,
    createdAt: now,
    updatedAt: now,
    status: OFFER_STATUS.PENDING,
    ...offer,
    sellerComment: offer.sellerComment ?? null,
    comments: appendComment(carriedComments, newComment),
  };
  writeOffers([payload, ...cleaned]);
  return payload;
}

async function updateOffer(offerId, patch) {
  const offers = readOffers();
  const now = new Date().toISOString();
  const next = offers.map((o) =>
    o.id === offerId ? { ...o, ...patch, updatedAt: now } : o,
  );
  writeOffers(next);
  return next.find((o) => o.id === offerId) ?? null;
}

export async function declineOffer(offerId, { buyerComment } = {}) {
  const offers = readOffers();
  const target = offers.find((o) => o.id === offerId);
  if (!target) return null;
  const comments = appendComment(target.comments, makeComment("buyer", buyerComment));
  return updateOffer(offerId, {
    status: OFFER_STATUS.DECLINED,
    buyerComment: buyerComment ?? null,
    comments,
  });
}

export async function blockOffer(offerId, { buyerComment } = {}) {
  const offers = readOffers();
  const target = offers.find((o) => o.id === offerId);
  if (!target) return null;
  const comments = appendComment(target.comments, makeComment("buyer", buyerComment));
  return updateOffer(offerId, {
    status: OFFER_STATUS.BLOCKED,
    buyerComment: buyerComment ?? null,
    comments,
  });
}

export async function acceptOffer(offerId, { buyerComment } = {}) {
  const offers = readOffers();
  const target = offers.find((o) => o.id === offerId);
  if (!target) return null;
  const now = new Date().toISOString();
  const acceptedComments = appendComment(target.comments, makeComment("buyer", buyerComment));
  const next = offers.map((o) => {
    if (o.id === offerId) {
      return {
        ...o,
        status: OFFER_STATUS.ACCEPTED,
        acceptedAt: now,
        updatedAt: now,
        buyerComment: buyerComment ?? o.buyerComment ?? null,
        comments: acceptedComments,
      };
    }
    if (
      o.requestId === target.requestId &&
      (o.status === OFFER_STATUS.PENDING || o.status === OFFER_STATUS.DECLINED)
    ) {
      return { ...o, status: OFFER_STATUS.SUPERSEDED, updatedAt: now };
    }
    return o;
  });
  writeOffers(next);
  return next.find((o) => o.id === offerId) ?? null;
}

export async function markOfferReadyToShip(offerId) {
  return updateOffer(offerId, {
    status: OFFER_STATUS.READY_TO_SHIP,
    readyToShipAt: new Date().toISOString(),
  });
}

export async function markOfferPaid(offerId, { address, paymentMethod }) {
  return updateOffer(offerId, {
    status: OFFER_STATUS.PAID,
    paidAt: new Date().toISOString(),
    shippingAddress: address || null,
    paymentMethod: paymentMethod || null,
  });
}

/** Append a free-form chat message to the offer's comment history.
 *  Used by the chat surfaces so messages persist across reloads. */
export async function appendOfferChatMessage(offerId, { author, text }) {
  const offers = readOffers();
  const target = offers.find((o) => o.id === offerId);
  if (!target) return null;
  const comment = makeComment(author, text);
  if (!comment) return target;
  return updateOffer(offerId, {
    comments: appendComment(target.comments, comment),
  });
}
