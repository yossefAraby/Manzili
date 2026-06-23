// Orders API calls + DTO adapters for the .NET backend.
//
// The backend now performs order-splitting server-side, so each API "order"
// already represents a single (store) order. We adapt those DTOs into the flat
// UI order shape the orders page + OrderItem component consume:
//
//   { id, total, status, paymentMethod, isPaid, createdAt, address,
//     orderItems:[{ productId, quantity, price, product:{ name, images, category } }],
//     shipment? }
//
// Every function FAILS SAFE: an API error or empty DB returns [] / null so the
// page renders an empty state instead of throwing.

import { apiGet, apiPost } from './client';

function toImageList(images) {
  if (!Array.isArray(images)) {
    if (typeof images === 'string' && images) return [images];
    return [];
  }
  return images
    .map((img) => (typeof img === 'string' ? img : img?.src || img?.url))
    .filter(Boolean);
}

function adaptOrderItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const product = raw.product || {};
  const productId = raw.productId ?? product.id ?? raw.product_id ?? null;
  // Images may live on the item (legacy `image`) or on a nested product.
  const images = toImageList(
    product.images ?? raw.images ?? (raw.image ? [raw.image] : [])
  );
  return {
    productId: productId != null ? String(productId) : null,
    quantity: Number(raw.quantity ?? 1),
    price: Number(raw.price ?? product.price ?? 0),
    product: {
      id: product.id != null ? String(product.id) : (productId != null ? String(productId) : null),
      name: product.name ?? raw.name ?? '',
      images,
      category: product.category ?? raw.category ?? '',
    },
  };
}

function adaptAddress(raw) {
  if (!raw || typeof raw !== 'object') {
    // OrderItem reads order.address.* directly — never hand it undefined.
    return { name: '', street: '', city: '', state: '', zip: '', country: '', phone: '' };
  }
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    name: raw.name ?? '',
    email: raw.email ?? '',
    street: raw.street ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
    zip: raw.zip != null ? String(raw.zip) : '',
    country: raw.country ?? '',
    phone: raw.phone ?? '',
  };
}

function adaptShipmentEvent(e) {
  if (!e || typeof e !== 'object') return null;
  return {
    type: e.type ?? e.event_type ?? e.eventType ?? null,
    description: e.description ?? e.desc ?? '',
    occurredAt: e.occurredAt ?? e.occurred_at ?? e.timestamp ?? e.date ?? null,
  };
}

function adaptShipment(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const events = Array.isArray(raw.events) ? raw.events.map(adaptShipmentEvent).filter(Boolean) : [];
  return {
    trackingNumber: raw.trackingNumber ?? raw.tracking_number ?? raw.trackingNo ?? null,
    carrier: raw.carrier ?? 'BOSTA',
    status: raw.status ?? null,
    statusText: raw.statusText ?? raw.status_text ?? null,
    awbUrl: raw.awbUrl ?? raw.awb_url ?? null,
    shippingCost: raw.shippingCost ?? raw.shipping_cost ?? null,
    codAmount: raw.codAmount ?? raw.cod_amount ?? null,
    shippedAt: raw.shippedAt ?? raw.shipped_at ?? null,
    deliveredAt: raw.deliveredAt ?? raw.delivered_at ?? null,
    events,
  };
}

/** Adapt one API order DTO into the flat UI order shape. */
export function adaptOrder(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const rawItems = Array.isArray(raw.orderItems)
    ? raw.orderItems
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  const orderItems = rawItems.map(adaptOrderItem).filter(Boolean);
  return {
    id: raw.id != null ? String(raw.id) : null,
    storeId: raw.storeId != null ? String(raw.storeId) : (raw.store?.id != null ? String(raw.store.id) : null),
    total: Number(raw.total ?? 0),
    status: raw.status ?? 'ORDER_PLACED',
    paymentMethod: raw.paymentMethod ?? 'COD',
    isPaid: Boolean(raw.isPaid),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? null,
    address: adaptAddress(raw.address),
    orderItems,
    shipment: adaptShipment(raw.shipment),
    coupon: raw.coupon ?? null,
    isCouponUsed: Boolean(raw.isCouponUsed),
  };
}

/**
 * Some API responses may still nest store-level orders under `storeOrders`.
 * Flatten those into individual UI orders so the page can render one row each.
 */
function flattenOrders(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const o of raw) {
    if (Array.isArray(o?.storeOrders) && o.storeOrders.length > 0) {
      for (const so of o.storeOrders) {
        out.push(
          adaptOrder({
            ...so,
            address: so.address ?? o.address,
            coupon: so.coupon ?? o.coupon,
            isCouponUsed: so.isCouponUsed ?? o.isCouponUsed,
          })
        );
      }
    } else {
      out.push(adaptOrder(o));
    }
  }
  return out.filter(Boolean);
}

/** GET /orders → adapted UI order list. Empty / failure → []. */
export async function fetchOrders() {
  try {
    const res = await apiGet('/orders');
    const data = res?.data;
    const list = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
    return flattenOrders(list);
  } catch {
    return [];
  }
}

/** GET /orders/{id} → adapted UI order, or null. */
export async function fetchOrderById(id) {
  if (!id) return null;
  try {
    const res = await apiGet(`/orders/${encodeURIComponent(id)}`);
    const data = res?.data;
    const order = data?.order ?? data;
    if (Array.isArray(order?.storeOrders) && order.storeOrders.length > 0) {
      const first = order.storeOrders[0];
      return adaptOrder({
        ...first,
        address: first.address ?? order.address,
        coupon: first.coupon ?? order.coupon,
      });
    }
    return adaptOrder(order);
  } catch {
    return null;
  }
}

/**
 * POST /orders to place an order.
 * @param {object} p
 * @param {Array}  p.items        cart items: { productId, quantity, variant }
 * @param {string} p.addressId    selected address id
 * @param {string} p.paymentMethod 'COD' | 'STRIPE'
 * @param {object|string|null} p.coupon coupon (or code)
 * Returns the adapted UI order on success; throws ApiError on failure so the
 * caller can surface the error.
 */
export async function createOrder({ items, addressId, paymentMethod = 'COD', coupon = null } = {}) {
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
  const res = await apiPost('/orders', payload);
  const data = res?.data;
  const order = data?.order ?? data;
  return adaptOrder(order) ?? { id: data?.orderId ?? null };
}

/**
 * Demo helper. POST /orders/{storeOrderId}/simulate-advance.
 * Advances the buyer's own store order one lifecycle step
 * (ORDER_PLACED/PROCESSING → SHIPPED → DELIVERED) through the same path the Bosta
 * webhook uses (wallet release + notifications fire). Lets a COD order — which is
 * never paid online — be walked to Delivered. Returns the new status string (or null).
 */
export async function simulateAdvanceOrder(storeOrderId) {
  if (!storeOrderId) throw new Error('Missing order id');
  const res = await apiPost(`/orders/${encodeURIComponent(storeOrderId)}/simulate-advance`);
  const data = res?.data;
  return data?.status ?? null;
}

/**
 * Request a return for a (store) order. POST /orders/{id}/return.
 * Returns the adapted order on success; throws ApiError on failure so the
 * caller can surface the error.
 */
export async function requestReturn(orderId, reason = '') {
  if (!orderId) throw new Error('Missing order id');
  const res = await apiPost(`/orders/${encodeURIComponent(orderId)}/return`, { reason });
  const data = res?.data;
  const order = data?.order ?? data;
  return adaptOrder(order) ?? { id: String(orderId), status: 'RETURNED' };
}
