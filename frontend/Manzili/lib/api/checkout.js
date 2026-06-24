// Checkout API calls for the .NET backend.
//
// createCheckoutSession() posts the cart to POST /api/v1/checkout and returns
// the Stripe-style result the cart flow expects: { url, sessionId, orderId }.
// The backend performs order-splitting server-side, so we only send the cart
// items, the selected addressId, the payment method, and any coupon.
//
// This throws ApiError on failure so the caller (OrderSummary) can surface the
// error to the user.

import { apiPost } from './client';

/**
 * POST /checkout → Stripe Checkout session.
 * @param {object} p
 * @param {Array}  p.items        cart items: { productId, quantity, variant }
 * @param {string} p.addressId    selected address id
 * @param {string} p.paymentMethod 'STRIPE' (default) | 'COD'
 * @param {object|string|null} p.coupon
 * @returns {Promise<{ url:string, sessionId:string|null, orderId:string|null }>}
 */
export async function createCheckoutSession({
  items,
  addressId,
  paymentMethod = 'STRIPE',
  coupon = null,
} = {}) {
  const payload = {
    addressId: addressId != null ? String(addressId) : undefined,
    paymentMethod,
    coupon: coupon ?? null,
    items: (Array.isArray(items) ? items : []).map((it) => ({
      productId: String(it.productId ?? it.id),
      quantity: Number(it.quantity ?? 1),
      variant: it.variant ?? it.variants ?? null,
    })),
  };
  const res = await apiPost('/checkout', payload);
  const data = res?.data ?? {};
  return {
    url: data.url ?? data.checkoutUrl ?? null,
    sessionId: data.sessionId ?? data.id ?? data.session_id ?? null,
    orderId: data.orderId ?? data.order_id ?? null,
  };
}

/**
 * POST /checkout/kashier → Kashier Hosted Payment Page URL. Same shape as createCheckoutSession:
 * the backend persists the order (server-trusted prices), signs the HPP URL, and returns it; the
 * cart redirects the buyer to it. On return the orders page calls confirmKashier().
 * @param {object} p
 * @param {string} p.method  Kashier sub-method: 'wallet' (mobile wallet) | 'fawry'
 * @returns {Promise<{ url:string|null, orderId:string|null }>}
 */
export async function createKashierPayment({ items, addressId, coupon = null, method = 'wallet' } = {}) {
  const payload = {
    addressId: addressId != null ? String(addressId) : undefined,
    coupon: coupon ?? null,
    method,
    items: (Array.isArray(items) ? items : []).map((it) => ({
      productId: String(it.productId ?? it.id),
      quantity: Number(it.quantity ?? 1),
      variant: it.variant ?? it.variants ?? null,
    })),
  };
  const res = await apiPost('/checkout/kashier', payload);
  const d = res?.data ?? {};
  return { url: d.url ?? null, orderId: d.orderId ?? d.order_id ?? null };
}

/**
 * POST /checkout/kashier/confirm — server-trusted confirm of the Kashier redirect return. Pass the
 * RAW return query string (e.g. window.location.search) so the backend verifies the signature over
 * the params in their original order, exactly as Kashier signed them. On SUCCESS the backend runs
 * the same idempotent fulfillment as the webhook.
 * @param {string} rawQuery the return-URL query string (with or without the leading "?")
 * @returns {Promise<{ status:string, orderId:string|null }>}
 */
export async function confirmKashier(rawQuery) {
  const res = await apiPost('/checkout/kashier/confirm', { query: rawQuery || '' });
  const d = res?.data ?? {};
  return { status: d.status ?? 'unpaid', orderId: d.orderId ?? d.order_id ?? null };
}

/**
 * POST /checkout/confirm — the backend verifies the completed Stripe session
 * server-side and runs fulfillment (creates the Bosta shipment, credits the
 * seller wallet, notifies). Idempotent, so calling it from the success redirect
 * is safe and means the flow completes even when an inbound Stripe webhook can't
 * reach the dev machine.
 * @param {string} sessionId  the Stripe Checkout Session id (from ?session_id=)
 * @returns {Promise<{ status:string, type:string|null, orderId:string|null, offerId:string|null }>}
 */
/**
 * POST /checkout/cancel — the buyer backed out of the payment page; cancel the still-unpaid order
 * so it doesn't linger. Fail-safe (returns false on error). Only affects the caller's unpaid order.
 */
export async function cancelPendingOrder(orderId) {
  if (!orderId) return false;
  try {
    const res = await apiPost('/checkout/cancel', { orderId: Number(orderId) });
    return !!(res?.data?.canceled);
  } catch {
    return false;
  }
}

export async function confirmCheckout(sessionId) {
  if (!sessionId) return { status: 'unpaid', type: null, orderId: null, offerId: null };
  const res = await apiPost('/checkout/confirm', { sessionId });
  const data = res?.data ?? {};
  return {
    status: data.status ?? 'unpaid',
    type: data.type ?? 'order',
    orderId: data.orderId ?? data.order_id ?? null,
    offerId: data.offerId ?? data.offer_id ?? null,
  };
}

/**
 * POST /checkout/quote → the money breakdown the cart shows, computed by the same backend
 * logic that charges the card, so the displayed total equals the charged total.
 * Buyer pays: goods − discount + the buyer Bosta shipping share + the Stripe fee.
 * @returns {Promise<{subtotal,discount,shipping,buyerShippingShare,sellerShippingShare,stripeFee,commission,total,sellerNet,stores}|null>}
 */
export async function quoteCheckout({ items, coupon = null, paymentMethod = 'STRIPE', addressId = null } = {}) {
  try {
    const payload = {
      // addressId lets the backend price shipping by the distance from each seller to the
      // buyer's chosen city; omitted (null) → a mid/unknown-distance estimate.
      addressId: addressId != null ? String(addressId) : undefined,
      items: (Array.isArray(items) ? items : []).map((it) => ({
        productId: String(it.productId ?? it.id),
        quantity: Number(it.quantity ?? 1),
        variant: it.variant ?? it.variants ?? null,
      })),
      coupon: coupon ?? null,
      paymentMethod,
    };
    const res = await apiPost('/checkout/quote', payload);
    const d = res?.data ?? {};
    const n = (v) => Number(v ?? 0);
    return {
      subtotal: n(d.subtotal), discount: n(d.discount), shipping: n(d.shipping),
      shippingLow: n(d.shippingLow ?? d.shipping), shippingHigh: n(d.shippingHigh ?? d.shipping),
      buyerShippingShare: n(d.buyerShippingShare), sellerShippingShare: n(d.sellerShippingShare),
      stripeFee: n(d.stripeFee), commission: n(d.commission), total: n(d.total),
      sellerNet: n(d.sellerNet), stores: n(d.stores),
    };
  } catch {
    return null;
  }
}
