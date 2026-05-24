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
 *   pending             → seller sent a proposal, buyer hasn't decided
 *   declined            → buyer declined; seller may submit a fresh proposal
 *   blocked             → buyer blocked this seller for this request (terminal)
 *   accepted            → buyer accepted — must pay the first milestone
 *                         before the seller starts working
 *   first_paid          → first milestone settled; seller is working
 *   progress_uploaded   → (big orders only) seller marked half-way; buyer
 *                         must settle the second milestone
 *   second_paid         → (big orders only) second milestone settled; seller
 *                         continues toward completion
 *   ready_to_ship       → seller marked the order ready; buyer must settle
 *                         the final milestone + provide shipping address
 *   paid                → all milestones settled (terminal)
 *
 * Invariant: per requestId, at most ONE offer is in
 * {accepted, first_paid, progress_uploaded, second_paid, ready_to_ship, paid}.
 * Accepting an offer auto-archives the rest as `superseded`.
 *
 * Each offer also carries:
 *   - `comments`: chronological history of seller proposals + buyer replies.
 *     Seeded into the chat on accept so the conversation feels continuous.
 *       [{ id, author: 'seller'|'buyer', text, createdAt }]
 *   - `payments`: chronological list of completed milestones.
 *       [{ id, milestone: 'first'|'second'|'final', amount, paymentMethod,
 *          address?, paidAt }]
 *     `address` is captured only on the final milestone — that's the moment
 *     the buyer commits a destination, not when they accept.
 *
 * Milestone schedule (driven by offer.price, not by status):
 *   - price > 1000 EGP: thirds — 1/3 on accept, 1/3 on progress, 1/3 on ship.
 *   - price ≤ 1000 EGP: halves — 1/2 on accept, 1/2 on ship (no mid-step).
 *
 * Use `getMilestoneSchedule(price)` to derive the {first, second?, final}
 * amounts so both buyer and seller UIs render identical numbers.
 */
export const OFFER_STATUS = Object.freeze({
  PENDING: "pending",
  DECLINED: "declined",
  BLOCKED: "blocked",
  ACCEPTED: "accepted",
  FIRST_PAID: "first_paid",
  PROGRESS_UPLOADED: "progress_uploaded",
  SECOND_PAID: "second_paid",
  READY_TO_SHIP: "ready_to_ship",
  PAID: "paid",
  SUPERSEDED: "superseded",
});

const ACTIVE_DEAL_STATUSES = new Set([
  OFFER_STATUS.ACCEPTED,
  OFFER_STATUS.FIRST_PAID,
  OFFER_STATUS.PROGRESS_UPLOADED,
  OFFER_STATUS.SECOND_PAID,
  OFFER_STATUS.READY_TO_SHIP,
  OFFER_STATUS.PAID,
]);

/**
 * Threshold (EGP) above which orders split into thirds rather than halves.
 * Exposed as a named export so the UI can label "≤ 1000 EGP" / "> 1000 EGP"
 * without redefining the constant.
 */
export const MILESTONE_SPLIT_THRESHOLD = 1000;

/**
 * Returns the milestone amounts for a given price. For "thirds" we hand the
 * remainder to the final milestone so the three numbers always sum exactly
 * to the price (avoids 0.01 drift on prices like 999.99 → ÷3 = 333.33).
 *
 * Shape: { mode: 'thirds'|'halves', first, second|null, final, total }
 */
export function getMilestoneSchedule(rawPrice) {
  const total = Number(rawPrice || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return { mode: "halves", first: 0, second: null, final: 0, total: 0 };
  }
  if (total > MILESTONE_SPLIT_THRESHOLD) {
    const third = Math.round((total / 3) * 100) / 100;
    const final = Math.round((total - third * 2) * 100) / 100;
    return { mode: "thirds", first: third, second: third, final, total };
  }
  const half = Math.round((total / 2) * 100) / 100;
  const final = Math.round((total - half) * 100) / 100;
  return { mode: "halves", first: half, second: null, final, total };
}

/**
 * Sum of milestones already settled on an offer. Used by the buyer UI to
 * show "EGP X of Y paid" and by the seller UI to show progress.
 */
export function getPaidTotal(offer) {
  if (!offer || !Array.isArray(offer.payments)) return 0;
  return offer.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
}

/**
 * Returns the next milestone the buyer needs to pay (or null if all are
 * settled). Driven by the offer status — `accepted` → first, `progress_uploaded`
 * → second, `ready_to_ship` → final. Other statuses yield null.
 */
export function getNextMilestone(offer) {
  if (!offer) return null;
  const sched = getMilestoneSchedule(offer.price);
  switch (offer.status) {
    case OFFER_STATUS.ACCEPTED:
      return { key: "first", amount: sched.first, schedule: sched };
    case OFFER_STATUS.PROGRESS_UPLOADED:
      return { key: "second", amount: sched.second, schedule: sched };
    case OFFER_STATUS.READY_TO_SHIP:
      return { key: "final", amount: sched.final, schedule: sched };
    default:
      return null;
  }
}

function toDateValue(value) {
  return new Date(value || 0).getTime();
}

function makeComment(author, text, image = null) {
  const trimmed = String(text || "").trim();
  if (!trimmed && !image) return null;
  return {
    id: makeEntityId("cmt"),
    author, // 'seller' | 'buyer'
    text: trimmed,
    image: image || null,
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

/**
 * Seller marks the order as half-way through. Only valid for offers in
 * `first_paid` — i.e. the first milestone has cleared and the order is
 * large enough to have a middle milestone. For small orders (≤ threshold)
 * there's no progress step; the seller jumps straight to ready_to_ship.
 */
export async function markOfferProgressUploaded(offerId) {
  return updateOffer(offerId, {
    status: OFFER_STATUS.PROGRESS_UPLOADED,
    progressUploadedAt: new Date().toISOString(),
  });
}

/**
 * Seller marks the order ready to ship. Valid after `first_paid` (small
 * orders) or `second_paid` (large orders that already cleared the middle
 * milestone). The buyer then settles the final milestone with an address.
 */
export async function markOfferReadyToShip(offerId) {
  return updateOffer(offerId, {
    status: OFFER_STATUS.READY_TO_SHIP,
    readyToShipAt: new Date().toISOString(),
  });
}

/**
 * Records a milestone payment and advances the offer's status accordingly.
 * `milestone` is one of `'first' | 'second' | 'final'`. The final milestone
 * is the only one that captures a shipping address.
 *
 * The previous single-payment `markOfferPaid` helper is preserved for older
 * code paths as a thin alias that calls this with milestone='final'.
 */
export async function recordOfferPayment(
  offerId,
  { milestone, amount, paymentMethod, address = null },
) {
  const offers = readOffers();
  const target = offers.find((o) => o.id === offerId);
  if (!target) return null;

  const now = new Date().toISOString();
  const payment = {
    id: makeEntityId("pay"),
    milestone, // 'first' | 'second' | 'final'
    amount: Number(amount || 0),
    paymentMethod: paymentMethod || null,
    address: milestone === "final" ? address || null : null,
    paidAt: now,
  };
  const payments = Array.isArray(target.payments)
    ? [...target.payments, payment]
    : [payment];

  // Map milestone → next status. Final settles the offer; first/second push
  // it into the corresponding "*_paid" state so the seller knows to resume.
  let nextStatus = target.status;
  const patch = { payments };
  if (milestone === "first") {
    nextStatus = OFFER_STATUS.FIRST_PAID;
    patch.firstPaidAt = now;
  } else if (milestone === "second") {
    nextStatus = OFFER_STATUS.SECOND_PAID;
    patch.secondPaidAt = now;
  } else if (milestone === "final") {
    nextStatus = OFFER_STATUS.PAID;
    patch.paidAt = now;
    patch.shippingAddress = address || null;
    patch.paymentMethod = paymentMethod || null;
  }
  patch.status = nextStatus;

  return updateOffer(offerId, patch);
}

/**
 * Legacy single-shot pay-on-ready helper. New code should call
 * `recordOfferPayment({ milestone: 'final', ... })` directly — this exists
 * so older imports keep working until they're migrated.
 */
export async function markOfferPaid(offerId, { address, paymentMethod }) {
  const offers = readOffers();
  const target = offers.find((o) => o.id === offerId);
  if (!target) return null;
  const sched = getMilestoneSchedule(target.price);
  return recordOfferPayment(offerId, {
    milestone: "final",
    amount: sched.final,
    address,
    paymentMethod,
  });
}

/** Append a free-form chat message to the offer's comment history.
 *  Used by the chat surfaces so messages persist across reloads. */
export async function appendOfferChatMessage(offerId, { author, text, image = null }) {
  const offers = readOffers();
  const target = offers.find((o) => o.id === offerId);
  if (!target) return null;
  const comment = makeComment(author, text, image);
  if (!comment) return target;
  return updateOffer(offerId, {
    comments: appendComment(target.comments, comment),
  });
}
