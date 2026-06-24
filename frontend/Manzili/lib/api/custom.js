// Custom-requests + offers API calls for the .NET backend, with adapters that
// map the API DTOs onto the shapes the custom UI consumes
// (app/(public)/custom/page.jsx, request-view/[id], negotiation/[id],
// collaboration/[id], components/CustomRequestCard.jsx).
//
// This module is the ONLY source of custom-request/offer data — there is no
// local/mock fallback. Read calls swallow errors and return a sensible empty
// value so pages render cleanly against an empty DB; mutation calls rethrow so
// the calling toast.promise / try-catch surfaces the error.
//
// The full offer state machine now lives on the backend:
//   - createOffer        POST   /custom/requests/{id}/offers
//   - transitionOffer    PATCH  /custom/offers/{id}        { action, comment? }
//   - payOfferMilestone  POST   /custom/offers/{id}/payments
// The OFFER_STATUS enum + milestone helpers below are pure client-side
// derivations of the offer shape (no persistence) used by both buyer + seller
// surfaces so they render identical numbers/labels.

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';

// ---------------------------------------------------------------------------
// offer status + milestone helpers (pure, client-side — no persistence)
// ---------------------------------------------------------------------------

/**
 * Offer lifecycle the negotiation UIs key off. Mirrors the backend status
 * strings exactly:
 *   pending → declined | blocked | accepted
 *   accepted → first_paid → (progress_uploaded → second_paid →) ready_to_ship → paid
 *   superseded (a losing offer once another is accepted)
 */
export const OFFER_STATUS = Object.freeze({
  PENDING: 'pending',
  DECLINED: 'declined',
  BLOCKED: 'blocked',
  ACCEPTED: 'accepted',
  FIRST_PAID: 'first_paid',
  PROGRESS_UPLOADED: 'progress_uploaded',
  SECOND_PAID: 'second_paid',
  READY_TO_SHIP: 'ready_to_ship',
  PAID: 'paid',
  SUPERSEDED: 'superseded',
});

/** Threshold (EGP) above which an order splits into thirds rather than halves. */
export const MILESTONE_SPLIT_THRESHOLD = 1000;

/**
 * Milestone amounts for a price. For "thirds" the remainder lands on the final
 * milestone so the three numbers sum exactly to the price.
 * Shape: { mode:'thirds'|'halves', first, second|null, final, total }
 */
export function getMilestoneSchedule(rawPrice) {
  const total = Number(rawPrice || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return { mode: 'halves', first: 0, second: null, final: 0, total: 0 };
  }
  if (total > MILESTONE_SPLIT_THRESHOLD) {
    const third = Math.round((total / 3) * 100) / 100;
    const final = Math.round((total - third * 2) * 100) / 100;
    return { mode: 'thirds', first: third, second: third, final, total };
  }
  const half = Math.round((total / 2) * 100) / 100;
  const final = Math.round((total - half) * 100) / 100;
  return { mode: 'halves', first: half, second: null, final, total };
}

/** Sum of milestones already settled on an offer. */
export function getPaidTotal(offer) {
  if (!offer || !Array.isArray(offer.payments)) return 0;
  return offer.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
}

/**
 * Next milestone the buyer needs to pay (or null when it's the seller's turn).
 * Driven by offer status: accepted→first, progress_uploaded→second,
 * ready_to_ship→final.
 */
export function getNextMilestone(offer) {
  if (!offer) return null;
  const sched = getMilestoneSchedule(offer.price);
  switch (offer.status) {
    case OFFER_STATUS.ACCEPTED:
      return { key: 'first', amount: sched.first, schedule: sched };
    case OFFER_STATUS.PROGRESS_UPLOADED:
      return { key: 'second', amount: sched.second, schedule: sched };
    case OFFER_STATUS.READY_TO_SHIP:
      return { key: 'final', amount: sched.final, schedule: sched };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// file → data URL helpers (used by custom-form for image/voice persistence)
// ---------------------------------------------------------------------------

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Read a camelCase or PascalCase field off a DTO, tolerating either casing. */
function pick(obj, name, fallback = undefined) {
  if (!obj || typeof obj !== 'object') return fallback;
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  const upper = name.charAt(0).toUpperCase() + name.slice(1);
  if (obj[lower] !== undefined) return obj[lower];
  if (obj[upper] !== undefined) return obj[upper];
  return fallback;
}

function asString(v) {
  return v === null || v === undefined ? '' : String(v);
}

// ---------------------------------------------------------------------------
// adapters
// ---------------------------------------------------------------------------

/**
 * Adapt a slim list-item DTO (or a full detail DTO) into the request shape the
 * /custom list + CustomRequestCard consume:
 *   { id, itemName, description, category, visibility, images:[url],
 *     createdAt, updatedAt, ownerUserId, user:{name}, store:{name} }
 * The API list item lacks description / images array / ownerUserId, so we
 * default those (the list page tolerates empty description in its search
 * filter, and the card renders a placeholder when images is empty).
 */
export function adaptRequestListItem(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const user = pick(dto, 'user', null);
  const store = pick(dto, 'store', null);
  const singleImage = pick(dto, 'image', '');
  const imagesArr = pick(dto, 'images', null);
  const images = Array.isArray(imagesArr)
    ? imagesArr.filter(Boolean)
    : singleImage
      ? [singleImage]
      : [];
  return {
    id: asString(pick(dto, 'id', '')),
    itemName: pick(dto, 'itemName', '') || '',
    description: pick(dto, 'description', '') || '',
    category: pick(dto, 'category', '') || '',
    visibility: pick(dto, 'visibility', 'open') || 'open',
    images,
    createdAt: pick(dto, 'createdAt', null),
    updatedAt: pick(dto, 'updatedAt', null),
    ownerUserId: user ? asString(pick(user, 'id', '')) || null : null,
    user: user ? { name: pick(user, 'name', '') || '' } : null,
    store: store ? { id: asString(pick(store, 'id', '')), name: pick(store, 'name', '') || '' } : null,
  };
}

/**
 * Adapt the full detail DTO into the shape request-view / negotiation read.
 * Mirrors the persisted local request shape (itemName, description, images[],
 * size{length,width,height}, colors[], deliveryDate, quantity, material,
 * visibility, store, user, ownerUserId, voiceMemoUrl, createdAt, updatedAt).
 */
export function adaptRequestDetail(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const user = pick(dto, 'user', null);
  const store = pick(dto, 'store', null);
  const sizeDto = pick(dto, 'size', null);
  const images = pick(dto, 'images', null);
  const size = sizeDto
    ? {
        length: pick(sizeDto, 'length', '') ?? '',
        width: pick(sizeDto, 'width', '') ?? '',
        height: pick(sizeDto, 'height', '') ?? '',
      }
    : { length: '', width: '', height: '' };
  return {
    id: asString(pick(dto, 'id', '')),
    itemName: pick(dto, 'itemName', '') || '',
    description: pick(dto, 'description', '') || '',
    category: pick(dto, 'category', '') || '',
    images: Array.isArray(images) ? images.filter(Boolean) : [],
    voiceMemoUrl: pick(dto, 'voiceMemo', null) || null,
    quantity: pick(dto, 'quantity', 1) ?? 1,
    material: pick(dto, 'material', '') || '',
    size,
    sizeMode: 'dimensions',
    packageSize: null,
    colors: Array.isArray(pick(dto, 'colors', null))
      ? pick(dto, 'colors', []).map((c) => ({ hex: pick(c, 'hex', '') || '', description: pick(c, 'description', '') || '' }))
      : [],
    deliveryDate: pick(dto, 'deliveryDate', '') || '',
    visibility: pick(dto, 'visibility', 'open') || 'open',
    store: store ? { id: asString(pick(store, 'id', '')), name: pick(store, 'name', '') || '' } : null,
    user: user ? { id: asString(pick(user, 'id', '')), name: pick(user, 'name', '') || '', image: pick(user, 'image', '') || null } : null,
    ownerUserId: user ? asString(pick(user, 'id', '')) || null : null,
    storeId: store ? asString(pick(store, 'id', '')) || null : null,
    createdAt: pick(dto, 'createdAt', null),
    updatedAt: pick(dto, 'updatedAt', null),
  };
}

/**
 * Adapt an OfferDto into the offer shape the negotiation/request-view UIs read
 * (status, price, deliveryDate, sellerId, sellerName, comments[], payments[],
 * shippingAddress, *At timestamps). The status string already matches
 * OFFER_STATUS values in localCustomRequestService.js.
 */
export function adaptOffer(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const comments = pick(dto, 'comments', null);
  const payments = pick(dto, 'payments', null);
  const shippingAddress = pick(dto, 'shippingAddress', null);
  const orderId = pick(dto, 'orderId', null);
  const storeOrderId = pick(dto, 'storeOrderId', null);
  const productId = pick(dto, 'productId', null);
  return {
    id: asString(pick(dto, 'id', '')),
    requestId: asString(pick(dto, 'requestId', '')),
    sellerId: asString(pick(dto, 'sellerId', '')) || null,
    sellerName: pick(dto, 'sellerName', '') || '',
    sellerLogo: pick(dto, 'sellerLogo', null) || null,
    price: Number(pick(dto, 'price', 0)) || 0,
    deliveryDate: pick(dto, 'deliveryDate', null),
    status: pick(dto, 'status', '') || '',
    comments: Array.isArray(comments) ? comments.map(adaptComment) : [],
    payments: Array.isArray(payments) ? payments.map(adaptPayment) : [],
    shippingAddress: shippingAddress
      ? {
          id: asString(pick(shippingAddress, 'id', '')),
          name: pick(shippingAddress, 'name', null),
          phone: pick(shippingAddress, 'phone', null),
          city: pick(shippingAddress, 'city', null),
          street: pick(shippingAddress, 'street', null),
        }
      : null,
    createdAt: pick(dto, 'createdAt', null),
    updatedAt: pick(dto, 'updatedAt', null),
    acceptedAt: pick(dto, 'acceptedAt', null),
    firstPaidAt: pick(dto, 'firstPaidAt', null),
    readyToShipAt: pick(dto, 'readyToShipAt', null),
    paidAt: pick(dto, 'paidAt', null),
    // Custom-order tracking, populated once the final milestone turns the offer into a
    // real Bosta-tracked order. orderId/storeOrderId/productId/shipment are null until then.
    orderId: orderId != null ? asString(orderId) : null,
    storeOrderId: storeOrderId != null ? asString(storeOrderId) : null,
    productId: productId != null ? asString(productId) : null,
    shipment: adaptOfferShipment(pick(dto, 'shipment', null)),
    delivered: Boolean(pick(dto, 'delivered', false)),
  };
}

/**
 * Adapt the ShipmentDto attached to an offer into the same shape TrackingTimeline
 * consumes (mirrors lib/api/orders.js adaptShipment — kept inline so custom.js has
 * no cross-module dependency). Returns null when there's no shipment yet.
 */
function adaptOfferShipment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rawEvents = pick(raw, 'events', null);
  const events = Array.isArray(rawEvents)
    ? rawEvents.map((e) => ({
        type: pick(e, 'type', null),
        description: pick(e, 'description', '') || '',
        occurredAt: pick(e, 'occurredAt', null),
      }))
    : [];
  return {
    trackingNumber: pick(raw, 'trackingNumber', null),
    carrier: pick(raw, 'carrier', 'BOSTA') || 'BOSTA',
    status: pick(raw, 'status', null),
    statusText: pick(raw, 'statusText', null),
    awbUrl: pick(raw, 'awbUrl', null),
    shippingCost: pick(raw, 'shippingCost', null),
    codAmount: pick(raw, 'codAmount', null),
    shippedAt: pick(raw, 'shippedAt', null),
    deliveredAt: pick(raw, 'deliveredAt', null),
    events,
  };
}

function adaptComment(c) {
  return {
    id: asString(pick(c, 'id', '')),
    author: pick(c, 'author', 'buyer') || 'buyer',
    text: pick(c, 'text', '') || '',
    image: pick(c, 'image', null) || null,
    createdAt: pick(c, 'createdAt', null),
  };
}

function adaptPayment(p) {
  return {
    id: asString(pick(p, 'id', '')),
    milestone: pick(p, 'milestone', '') || '',
    amount: Number(pick(p, 'amount', 0)) || 0,
    paymentMethod: pick(p, 'paymentMethod', null) || null,
    paidAt: pick(p, 'paidAt', null),
  };
}

/** Adapt an OfferMessageDto into the chat-comment shape used by the UIs. */
export function adaptMessage(m) {
  return {
    id: asString(pick(m, 'id', '')),
    author: pick(m, 'author', 'buyer') || 'buyer',
    text: pick(m, 'text', '') || '',
    image: pick(m, 'image', null) || null,
    createdAt: pick(m, 'createdAt', null),
  };
}

// ---------------------------------------------------------------------------
// API calls (fail-safe)
// ---------------------------------------------------------------------------

/**
 * GET /custom/requests?page&limit → { requests: [adapted], total, page, limit }.
 * Returns { requests: [], total: 0 } on any failure.
 */
export async function fetchRequests({ page = 1, limit = 50 } = {}) {
  try {
    const r = await apiGet(`/custom/requests?page=${page}&limit=${limit}`);
    const raw = (r?.data && (r.data.requests ?? r.data.Requests)) ?? r?.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return {
      requests: list.map(adaptRequestListItem).filter(Boolean),
      total: r?.total ?? list.length,
      page: r?.page ?? page,
      limit: r?.limit ?? limit,
    };
  } catch {
    return { requests: [], total: 0, page, limit };
  }
}

/** GET /custom/requests/{id} → adapted detail, or null on failure / not-found. */
export async function fetchRequestById(id) {
  if (!id) return null;
  try {
    const r = await apiGet(`/custom/requests/${encodeURIComponent(id)}`);
    return adaptRequestDetail(r?.data ?? null);
  } catch {
    return null;
  }
}

/**
 * POST /custom/requests → adapted detail of the created request.
 * Rethrows so the caller (custom-form) surfaces the error.
 */
export async function createRequest(payload) {
  // The backend binds size dimensions to nullable doubles. The form's default
  // is { length:'', width:'', height:'' } and untouched / non-size categories
  // submit those empty strings — which System.Text.Json cannot deserialize into
  // double?, so the whole request 400s ("Failed to submit request"). Coerce each
  // dimension to a number or null so only real values are sent.
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
  const rawSize = payload?.size || {};
  const size = {
    length: num(rawSize.length),
    width: num(rawSize.width),
    height: num(rawSize.height),
  };
  const body = {
    itemName: payload?.itemName,
    description: payload?.description,
    category: payload?.category,
    visibility: payload?.visibility || 'open',
    quantity: payload?.quantity,
    size,
    material: payload?.material,
    deliveryDate: payload?.deliveryDate || null,
    images: Array.isArray(payload?.images) ? payload.images : [],
    voiceMemoUrl: payload?.voiceMemoUrl || null,
    storeId: payload?.storeId || null,
    colors: Array.isArray(payload?.colors)
      ? payload.colors.filter((c) => c && (c.hex || c.description)).map((c) => ({ hex: c.hex || '', description: c.description || '' }))
      : [],
  };
  const r = await apiPost('/custom/requests', body);
  return adaptRequestDetail(r?.data ?? null);
}

/**
 * PUT /custom/requests/{id} → adapted detail. Rethrows on failure.
 * Sends the FULL request body (same shape as createRequest) so an edit persists every
 * field, not just name/description/visibility. The edit form re-loads the existing images
 * + voice memo before submit, so they're re-sent here and preserved. Omitting a field
 * (undefined) tells the backend to leave it unchanged.
 */
export async function updateRequest(id, payload) {
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
  const rawSize = payload?.size || {};
  const body = {
    itemName: payload?.itemName,
    description: payload?.description,
    category: payload?.category,
    visibility: payload?.visibility,
    quantity: payload?.quantity,
    size: { length: num(rawSize.length), width: num(rawSize.width), height: num(rawSize.height) },
    material: payload?.material,
    deliveryDate: payload?.deliveryDate || null,
    images: Array.isArray(payload?.images) ? payload.images : undefined,
    voiceMemoUrl: payload?.voiceMemoUrl ?? undefined,
    storeId: payload?.storeId ?? undefined,
    colors: Array.isArray(payload?.colors)
      ? payload.colors.filter((c) => c && (c.hex || c.description)).map((c) => ({ hex: c.hex || '', description: c.description || '' }))
      : undefined,
  };
  const r = await apiPut(`/custom/requests/${encodeURIComponent(id)}`, body);
  return adaptRequestDetail(r?.data ?? null);
}

/** DELETE /custom/requests/{id}. Returns true on success, false on failure. */
export async function deleteRequest(id) {
  try {
    await apiDelete(`/custom/requests/${encodeURIComponent(id)}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /custom/requests/{id}/offers → [adapted offers]. Empty array on failure.
 */
export async function fetchOffers(requestId) {
  if (!requestId) return [];
  try {
    const r = await apiGet(`/custom/requests/${encodeURIComponent(requestId)}/offers`);
    const raw = (r?.data && (r.data.offers ?? r.data.Offers)) ?? r?.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map(adaptOffer).filter(Boolean);
  } catch {
    return [];
  }
}

/** GET /custom/requests/{id}/active-offer → adapted offer, or null. */
export async function fetchActiveOffer(requestId) {
  if (!requestId) return null;
  try {
    const r = await apiGet(`/custom/requests/${encodeURIComponent(requestId)}/active-offer`);
    return adaptOffer(r?.data ?? null);
  } catch {
    return null;
  }
}

/** GET /custom/offers/{id}/messages → [adapted messages]. Empty on failure. */
export async function fetchOfferMessages(offerId) {
  if (!offerId) return [];
  try {
    const r = await apiGet(`/custom/offers/${encodeURIComponent(offerId)}/messages`);
    const raw = (r?.data && (r.data.messages ?? r.data.Messages)) ?? r?.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map(adaptMessage).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * POST /custom/offers/{id}/messages → adapted message. Rethrows on failure so
 * the caller can keep the optimistic UI behavior.
 */
export async function sendOfferMessage(offerId, { text, imageUrl } = {}) {
  const r = await apiPost(`/custom/offers/${encodeURIComponent(offerId)}/messages`, {
    text: text || '',
    image: imageUrl || null,
  });
  return adaptMessage(r?.data ?? null);
}

// ---------------------------------------------------------------------------
// offer mutations (rethrow on failure — wired to toast.promise / try-catch)
// ---------------------------------------------------------------------------

/**
 * POST /custom/requests/{id}/offers — seller submits (or resubmits) a proposal.
 * Body: { price, deliveryDate?, comment? }. Returns the adapted offer.
 */
export async function createOffer(requestId, { price, deliveryDate, comment } = {}) {
  const r = await apiPost(`/custom/requests/${encodeURIComponent(requestId)}/offers`, {
    price: Number(price) || 0,
    deliveryDate: deliveryDate || null,
    comment: comment || null,
  });
  return adaptOffer(r?.data ?? null);
}

/**
 * PATCH /custom/offers/{id} — advance an offer through its state machine.
 * `action` is one of: accept | decline | block | progress | ready.
 *   - accept / decline / block: buyer decisions on a pending offer
 *   - progress: seller marks a large order half-way (progress_uploaded)
 *   - ready:    seller marks the order ready_to_ship
 * `comment` is an optional note attached to the transition. Returns the
 * adapted offer.
 */
export async function transitionOffer(offerId, action, comment) {
  const r = await apiPatch(`/custom/offers/${encodeURIComponent(offerId)}`, {
    action,
    comment: comment || null,
  });
  return adaptOffer(r?.data ?? null);
}

/**
 * POST /custom/offers/{id}/payments — buyer settles a milestone.
 * Body: { milestone: 'first'|'second'|'final', amount, paymentMethod, addressId? }.
 * The final milestone is the only one that carries a shipping address. Returns
 * the adapted offer (with the advanced status + recorded payment).
 */
export async function payOfferMilestone(
  offerId,
  { milestone, amount, paymentMethod, addressId } = {},
) {
  const r = await apiPost(`/custom/offers/${encodeURIComponent(offerId)}/payments`, {
    milestone,
    amount: Number(amount) || 0,
    paymentMethod: paymentMethod || null,
    addressId: addressId || null,
  });
  return adaptOffer(r?.data ?? null);
}

/**
 * POST /custom/offers/{id}/checkout — open a Stripe portal for a custom-order
 * milestone (the "similar checkout logic" as the cart). The backend creates the
 * Stripe session; on success it records the milestone and, for the final one,
 * turns the offer into a real Bosta-tracked order. Returns { url, sessionId }.
 * Throws (e.g. 503) when Stripe isn't configured, so the caller can fall back to
 * recording the payment directly via payOfferMilestone.
 */
export async function createOfferCheckout(offerId, { milestone, amount, addressId } = {}) {
  const r = await apiPost(`/custom/offers/${encodeURIComponent(offerId)}/checkout`, {
    milestone: milestone || 'final',
    amount: Number(amount) || 0,
    addressId: addressId != null ? String(addressId) : null,
  });
  const data = r?.data ?? {};
  return { url: data.url ?? null, sessionId: data.sessionId ?? data.id ?? null };
}

/**
 * POST /custom/offers/{id}/kashier — open a Kashier Hosted Payment Page for a custom-order
 * milestone (Mobile Wallet or Fawry). The backend signs the HPP URL and returns it; the page
 * redirects the buyer. On return it calls confirmOfferKashier().
 * @param {object} p
 * @param {string} p.method  'wallet' (mobile wallet) | 'fawry'
 * @returns {Promise<{ url:string|null }>}
 */
export async function createOfferKashierPayment(offerId, { milestone, amount, addressId, method = 'wallet' } = {}) {
  const r = await apiPost(`/custom/offers/${encodeURIComponent(offerId)}/kashier`, {
    milestone: milestone || 'final',
    amount: Number(amount) || 0,
    addressId: addressId != null ? String(addressId) : null,
    method,
  });
  const data = r?.data ?? {};
  return { url: data.url ?? null };
}

/**
 * POST /custom/offers/{id}/kashier/confirm — server-trusted confirm of the Kashier milestone return.
 * Pass the raw return query string (for signature verification) plus the milestone/amount/address
 * that identify the payment. On SUCCESS the backend records the milestone (and finalizes the order
 * on the final one). Returns { status }.
 */
export async function confirmOfferKashier(offerId, { query, milestone, amount, addressId } = {}) {
  const r = await apiPost(`/custom/offers/${encodeURIComponent(offerId)}/kashier/confirm`, {
    query: query || '',
    milestone: milestone || 'final',
    amount: Number(amount) || 0,
    addressId: addressId != null ? String(addressId) : null,
  });
  const data = r?.data ?? {};
  return { status: data.status ?? 'unpaid' };
}
