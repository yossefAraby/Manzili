// Admin API calls for the .NET backend, with adapters mapping the AdminDtos
// onto the shapes the admin pages already consume (app/admin/* + their
// components). Admin endpoints require an admin JWT (obtained via the separate
// admin login — see lib/api/auth.apiAdminLogin + components/admin/AdminLayout).
//
// FAIL-SAFE: read functions swallow API/network errors and return an empty
// value so each admin page renders cleanly against an empty DB. Action helpers
// rethrow so the existing toast.promise error handling fires.
//
// PARITY NOTES:
//   - reportAction: the API body is { action, adminNote } only — the UI's
//     disableProduct / disableStore checkboxes have no API counterpart, so
//     they are dropped (best-effort) when routed to the API.
//   - coupons: backed by /admin/coupons (list/create/delete). Product-scoped
//     coupons record the scope but not per-product links in this pass.

import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

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

function arrFrom(dataObj, key) {
  // Accept either an array directly or an envelope-wrapped { key: [] }.
  if (Array.isArray(dataObj)) return dataObj;
  const lower = key;
  const upper = key.charAt(0).toUpperCase() + key.slice(1);
  const v = dataObj?.[lower] ?? dataObj?.[upper];
  return Array.isArray(v) ? v : [];
}

// ---------------------------------------------------------------------------
// adapters
// ---------------------------------------------------------------------------

/** AdminStatsDto → { stores, products, orders, revenue, pendingReports }. */
export function adaptStats(dto) {
  return {
    stores: Number(pick(dto, 'stores', 0)) || 0,
    products: Number(pick(dto, 'products', 0)) || 0,
    orders: Number(pick(dto, 'orders', 0)) || 0,
    revenue: Number(pick(dto, 'revenue', 0)) || 0,
    pendingReports: Number(pick(dto, 'pendingReports', 0)) || 0,
  };
}

/**
 * AdminOrderDto → the order shape the orders table reads:
 *   { id, store:{name}, order:{address:{name,phone,...}}, total, paymentMethod,
 *     status, createdAt, orderItems:[{name,quantity,price}], shipment }
 * The API has no address/payment-method/per-item-price fields, so default them.
 */
export function adaptOrder(dto) {
  const items = pick(dto, 'items', null);
  return {
    id: asString(pick(dto, 'id', '')),
    store: { name: pick(dto, 'storeName', '') || '' },
    order: { address: { name: pick(dto, 'customerName', '') || '', phone: '' } },
    total: Number(pick(dto, 'total', 0)) || 0,
    paymentMethod: pick(dto, 'paymentMethod', '') || '—',
    status: pick(dto, 'status', '') || '',
    createdAt: pick(dto, 'createdAt', null),
    orderItems: Array.isArray(items)
      ? items.map((it) => ({
          name: pick(it, 'name', '') || '',
          quantity: Number(pick(it, 'quantity', 0)) || 0,
          price: Number(pick(it, 'price', 0)) || 0,
        }))
      : [],
    shipment: null,
  };
}

/**
 * AdminProductDto → the product shape the products table reads:
 *   { id, name, price, mrp, category, store:{name}, inStock, isDisabled,
 *     description, images:[] }. API lacks mrp/description/images → default.
 */
export function adaptProduct(dto) {
  return {
    id: asString(pick(dto, 'id', '')),
    name: pick(dto, 'name', '') || '',
    price: Number(pick(dto, 'price', 0)) || 0,
    mrp: Number(pick(dto, 'price', 0)) || 0,
    category: pick(dto, 'category', '') || '',
    store: { name: pick(dto, 'storeName', '') || '' },
    inStock: Boolean(pick(dto, 'inStock', false)),
    isDisabled: Boolean(pick(dto, 'isDisabled', false)),
    description: pick(dto, 'description', '') || '',
    images: [],
  };
}

/**
 * AdminStoreDto → the store shape the stores table reads:
 *   { id, name, username, logo, email, contact, address, status, isActive,
 *     createdAt, user:{name,email,image}, _count:{Product,StoreOrder} }
 * API lacks username/logo/contact/address/counts → default sensibly so the
 * existing <Image src={store.logo}> etc. don't crash on undefined.
 */
export function adaptStore(dto) {
  const ownerName = pick(dto, 'ownerName', '') || '';
  const ownerEmail = pick(dto, 'ownerEmail', '') || '';
  const name = pick(dto, 'name', '') || '';
  return {
    id: asString(pick(dto, 'id', '')),
    name,
    username: pick(dto, 'username', '') || (name ? name.toLowerCase().replace(/\s+/g, '') : 'store'),
    logo: pick(dto, 'logo', '') || '/placeholder.png',
    // National-ID photo URL for the verification review board ('' when none).
    nationalIdImage: pick(dto, 'nationalIdImage', '') || '',
    email: pick(dto, 'email', '') || ownerEmail,
    contact: pick(dto, 'contact', '') || '—',
    address: pick(dto, 'address', '') || '—',
    status: pick(dto, 'status', '') || '',
    isActive: Boolean(pick(dto, 'isActive', false)),
    createdAt: pick(dto, 'createdAt', null) || new Date().toISOString(),
    user: { name: ownerName, email: ownerEmail, image: pick(dto, 'ownerImage', '') || '/placeholder.png' },
    _count: {
      Product: Number(pick(dto, 'productCount', 0)) || 0,
      StoreOrder: Number(pick(dto, 'orderCount', 0)) || 0,
    },
  };
}

/**
 * AdminReportDto → the report shape the reports/dashboard tables read:
 *   { id, type, reason, description, status, adminNote, createdAt,
 *     reporter:{name,email}, productId, storeId, storeOrderId, customRequestId }
 * API lacks reporter + target ids → default null so the optional renders skip.
 */
export function adaptReport(dto) {
  const reporterName = pick(dto, 'reporterName', '') || '';
  return {
    id: asString(pick(dto, 'id', '')),
    type: pick(dto, 'type', '') || 'GENERAL',
    reason: pick(dto, 'reason', '') || '',
    description: pick(dto, 'description', '') || '',
    status: pick(dto, 'status', '') || 'PENDING',
    adminNote: pick(dto, 'adminNote', '') || '',
    createdAt: pick(dto, 'createdAt', null) || new Date().toISOString(),
    reporter: reporterName ? { name: reporterName, email: '' } : null,
    productId: pick(dto, 'productId', null),
    storeId: pick(dto, 'storeId', null),
    storeOrderId: pick(dto, 'storeOrderId', null),
    customRequestId: pick(dto, 'customRequestId', null),
  };
}

const REQUEST_STATUS_LABELS = { 0: 'open', 1: 'private', 2: 'closed' };

/**
 * AdminRequestDto → the request shape the admin requests table reads:
 *   { id, itemName, description, category, quantity, deliveryDate, visibility,
 *     images:[], user:{name,email}, store:{name}, createdAt }
 * API gives a numeric status only (no buyer/store/visibility) → derive a
 * visibility label from status and default the rest.
 */
export function adaptRequest(dto) {
  const statusNum = pick(dto, 'status', null);
  return {
    id: asString(pick(dto, 'id', '')),
    itemName: pick(dto, 'itemName', '') || '',
    description: pick(dto, 'description', '') || '',
    category: pick(dto, 'category', '') || '',
    quantity: pick(dto, 'quantity', null),
    deliveryDate: pick(dto, 'deliveryDate', null),
    visibility:
      statusNum != null && REQUEST_STATUS_LABELS[statusNum]
        ? REQUEST_STATUS_LABELS[statusNum]
        : 'open',
    images: [],
    user: pick(dto, 'user', null),
    store: pick(dto, 'store', null),
    createdAt: pick(dto, 'createdAt', null) || new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// API calls (fail-safe)
// ---------------------------------------------------------------------------

/** GET /admin/stats → adapted stats (zeroes on failure). */
export async function fetchStats() {
  try {
    const r = await apiGet('/admin/stats');
    return adaptStats(r?.data ?? {});
  } catch {
    return adaptStats({});
  }
}

/**
 * GET /admin/revenue → Manzili's commission earnings (full admins only; 403 for moderators).
 * Fail-safe: returns null on any error so the dashboard simply hides the card.
 * Shape: { platformRevenue, standardCommission, customCommission, standardSales, customSales,
 *          grossSales, standardRatePercent, customRatePercent }
 */
export async function fetchAdminRevenue() {
  try {
    const r = await apiGet('/admin/revenue');
    const d = r?.data ?? {};
    return {
      platformRevenue: Number(pick(d, 'platformRevenue', 0)) || 0,
      standardCommission: Number(pick(d, 'standardCommission', 0)) || 0,
      customCommission: Number(pick(d, 'customCommission', 0)) || 0,
      promotionRevenue: Number(pick(d, 'promotionRevenue', 0)) || 0,
      standardSales: Number(pick(d, 'standardSales', 0)) || 0,
      customSales: Number(pick(d, 'customSales', 0)) || 0,
      grossSales: Number(pick(d, 'grossSales', 0)) || 0,
      standardRatePercent: Number(pick(d, 'standardRatePercent', 15)) || 15,
      customRatePercent: Number(pick(d, 'customRatePercent', 10)) || 10,
    };
  } catch {
    return null;
  }
}

/** GET /admin/orders → [adapted orders]. Empty on failure. */
export async function fetchOrders() {
  try {
    const r = await apiGet('/admin/orders?page=1&limit=200');
    return arrFrom(r?.data, 'orders').map(adaptOrder);
  } catch {
    return [];
  }
}

/** GET /admin/products → [adapted products]. Empty on failure. */
export async function fetchProducts() {
  try {
    const r = await apiGet('/admin/products?page=1&limit=500');
    return arrFrom(r?.data, 'products').map(adaptProduct);
  } catch {
    return [];
  }
}

/** GET /admin/stores[?status=] → [adapted stores]. Empty on failure. */
export async function fetchStores(status) {
  try {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const r = await apiGet(`/admin/stores${qs}`);
    return arrFrom(r?.data, 'stores').map(adaptStore);
  } catch {
    return [];
  }
}

/**
 * POST /admin/stores { storeId, action } → { id, status, isActive }.
 * `action` is one of: approve | reject | enable | disable | delete.
 * Rethrows on failure so the calling toast.promise shows the error.
 */
export async function storeAction({ storeId, action } = {}) {
  const r = await apiPost('/admin/stores', { storeId: asString(storeId), action });
  const d = r?.data ?? {};
  return {
    id: asString(pick(d, 'id', storeId)),
    status: pick(d, 'status', null),
    isActive: pick(d, 'isActive', null),
  };
}

/**
 * POST /admin/products { productId, action } → { id, isDisabled }.
 * `action` is one of: disable | enable | delete. Rethrows on failure so the
 * calling toast.promise shows the error.
 */
export async function productAction({ productId, action } = {}) {
  const r = await apiPost('/admin/products', { productId: asString(productId), action });
  const d = r?.data ?? {};
  return {
    id: asString(pick(d, 'id', productId)),
    isDisabled: pick(d, 'isDisabled', null),
  };
}

/**
 * POST /admin/orders/{id}/status — admin forces a store-order status transition
 * (Bosta can't reach a dev box, so the admin advances the order). Rethrows on failure.
 */
export async function forceOrderStatus(storeOrderId, status) {
  const r = await apiPost(`/admin/orders/${encodeURIComponent(asString(storeOrderId))}/status`, { status });
  return r?.data ?? null;
}

/** GET /admin/reports[?status=] → [adapted reports]. Empty on failure. */
export async function fetchReports(status) {
  try {
    const r = await apiGet('/admin/reports?page=1&limit=500');
    let list = arrFrom(r?.data, 'reports').map(adaptReport);
    if (status && status !== 'ALL') {
      list = list.filter((rep) => rep.status === status);
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * POST /admin/reports/{id}/action { action, adminNote } → { id, status }.
 * Rethrows on failure. disableProduct/disableStore are not part of the API
 * contract and are intentionally not sent (parity gap).
 */
export async function reportAction(id, action, note) {
  const r = await apiPost(`/admin/reports/${encodeURIComponent(id)}/action`, {
    action,
    adminNote: note || undefined,
  });
  const d = r?.data ?? {};
  return { id: asString(pick(d, 'id', id)), status: pick(d, 'status', null) };
}

/** GET /admin/requests → [adapted requests]. Empty on failure. */
export async function fetchRequests() {
  try {
    const r = await apiGet('/admin/requests');
    return arrFrom(r?.data, 'requests').map(adaptRequest);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// danger zone — full-admin-only test-data wipes (/admin/maintenance/*)
// ---------------------------------------------------------------------------

/**
 * POST /admin/maintenance/purge-items — permanently delete the whole catalog +
 * all custom items. Full admins only (403 for moderators). Rethrows on failure
 * so the calling toast.promise surfaces it. Returns the server message.
 */
export async function purgeAllItems() {
  const r = await apiPost('/admin/maintenance/purge-items', {});
  return pick(r?.data, 'message', 'All items deleted');
}

/**
 * POST /admin/maintenance/purge-users — permanently delete all non-admin users
 * and everything they own (admins are preserved). Full admins only. Rethrows on
 * failure. Returns the server message.
 */
export async function purgeAllUsers() {
  const r = await apiPost('/admin/maintenance/purge-users', {});
  return pick(r?.data, 'message', 'All users deleted');
}

// ---------------------------------------------------------------------------
// returns approval — /admin/returns
// ---------------------------------------------------------------------------

/**
 * AdminReturnDto → the return shape the admin returns page reads:
 *   { id, storeOrderId, storeName, customerName, reason, status, refundAmount,
 *     items:[{name,quantity}], createdAt }
 */
export function adaptReturn(dto) {
  const items = pick(dto, 'items', null);
  return {
    id: asString(pick(dto, 'id', '')),
    storeOrderId: asString(pick(dto, 'storeOrderId', '')),
    storeName: pick(dto, 'storeName', '') || '',
    customerName: pick(dto, 'customerName', '') || '',
    reason: pick(dto, 'reason', '') || '',
    status: pick(dto, 'status', 'PENDING_APPROVAL') || 'PENDING_APPROVAL',
    refundAmount: pick(dto, 'refundAmount', null),
    items: Array.isArray(items)
      ? items.map((it) => ({
          name: pick(it, 'name', '') || '',
          quantity: Number(pick(it, 'quantity', 0)) || 0,
        }))
      : [],
    createdAt: pick(dto, 'createdAt', null) || new Date().toISOString(),
  };
}

/** GET /admin/returns → [adapted returns awaiting approval]. Empty on failure. */
export async function fetchReturns() {
  try {
    const r = await apiGet('/admin/returns');
    return arrFrom(r?.data, 'returns').map(adaptReturn);
  } catch {
    return [];
  }
}

/**
 * POST /admin/returns/{id}/approve — runs Bosta reverse pickup + refund + wallet
 * reversal. Returns { id, status, refundAmount, trackingNumber }. Rethrows on
 * failure so the calling toast.promise surfaces the error.
 */
export async function approveReturn(id) {
  const r = await apiPost(`/admin/returns/${encodeURIComponent(id)}/approve`);
  const d = r?.data ?? {};
  return {
    id: asString(pick(d, 'id', id)),
    status: pick(d, 'status', null),
    refundAmount: pick(d, 'refundAmount', null),
    trackingNumber: pick(d, 'trackingNumber', null),
  };
}

/**
 * POST /admin/returns/{id}/reject { note } — mark rejected, no refund. Returns
 * { id, status }. Rethrows on failure.
 */
export async function rejectReturn(id, note) {
  const r = await apiPost(`/admin/returns/${encodeURIComponent(id)}/reject`, {
    note: note || undefined,
  });
  const d = r?.data ?? {};
  return { id: asString(pick(d, 'id', id)), status: pick(d, 'status', null) };
}

// ---------------------------------------------------------------------------
// coupons (admin-managed) — /admin/coupons
// ---------------------------------------------------------------------------

/**
 * AdminCouponDto → the coupon shape the admin coupons table reads:
 *   { id, code, description, discount, scope, storeId, productIds, expiresAt,
 *     maxUsers, usedCount, active, createdAt }
 * `discount` is the percentage; `productIds` isn't tracked server-side in this
 * pass so it defaults to [].
 */
export function adaptCoupon(dto) {
  return {
    id: asString(pick(dto, 'id', '')),
    code: pick(dto, 'code', '') || '',
    description: pick(dto, 'description', '') || '',
    discount: Number(pick(dto, 'discountPercentage', 0)) || 0,
    scope: pick(dto, 'scope', 'GLOBAL') || 'GLOBAL',
    storeId: pick(dto, 'storeId', null),
    productIds: [],
    expiresAt: pick(dto, 'expiredDate', null),
    maxUsers: Number(pick(dto, 'maxUsers', 0)) || 0,
    usedCount: Number(pick(dto, 'usedCount', 0)) || 0,
    active: Boolean(pick(dto, 'active', true)),
    createdAt: pick(dto, 'createdAt', null),
  };
}

/** GET /admin/coupons → [adapted coupons]. Empty on failure. */
export async function fetchCoupons() {
  try {
    const r = await apiGet('/admin/coupons');
    return arrFrom(r?.data, 'coupons').map(adaptCoupon);
  } catch {
    return [];
  }
}

/**
 * POST /admin/coupons → the created (adapted) coupon. Rethrows on failure so the
 * calling toast.promise surfaces the error.
 * @param {{code,description,discount,scope,expiresAt,maxUsers,storeId}} payload
 */
export async function createCoupon(payload = {}) {
  const r = await apiPost('/admin/coupons', {
    code: payload.code,
    description: payload.description,
    discountPercentage: Number(payload.discount) || 0,
    scope: payload.scope || 'GLOBAL',
    expiredDate: payload.expiresAt || null,
    maxUsers: payload.maxUsers != null && payload.maxUsers !== '' ? Number(payload.maxUsers) : null,
    storeId: payload.storeId || null,
  });
  return adaptCoupon(r?.data ?? {});
}

/** DELETE /admin/coupons/{id} → true/false. */
export async function deleteCoupon(id) {
  try {
    await apiDelete(`/admin/coupons/${encodeURIComponent(id)}`);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// identity + moderators — /admin/me, /admin/moderators
// ---------------------------------------------------------------------------

/** GET /admin/me → { id, name, isSuperAdmin, permissions:[section] } or null. */
export async function fetchAdminMe() {
  try {
    const r = await apiGet('/admin/me');
    const d = r?.data ?? {};
    const perms = pick(d, 'permissions', []);
    return {
      id: asString(pick(d, 'id', '')),
      name: pick(d, 'name', '') || '',
      isSuperAdmin: Boolean(pick(d, 'isSuperAdmin', false)),
      permissions: Array.isArray(perms) ? perms : [],
    };
  } catch {
    return null;
  }
}

/** GET /admin/moderators → [{ id, name, email, permissions:[] }] (super-admin only). Empty on failure. */
export async function fetchModerators() {
  try {
    const r = await apiGet('/admin/moderators');
    return arrFrom(r?.data, 'moderators').map((m) => {
      const perms = pick(m, 'permissions', []);
      return {
        id: asString(pick(m, 'id', '')),
        name: pick(m, 'name', '') || '',
        email: pick(m, 'email', '') || '',
        permissions: Array.isArray(perms) ? perms : [],
      };
    });
  } catch {
    return [];
  }
}

/** PUT /admin/moderators/{id}/permissions { permissions:[section] }. Rethrows on failure. */
export async function setModeratorPermissions(id, permissions) {
  const r = await apiPut(`/admin/moderators/${encodeURIComponent(id)}/permissions`, {
    permissions: Array.isArray(permissions) ? permissions : [],
  });
  return r?.data ?? null;
}

// ---------------------------------------------------------------------------
// conversation monitoring — /admin/conversations
// ---------------------------------------------------------------------------

/** GET /admin/conversations → [{ id, itemName, buyerName, sellerName, status, messageCount, lastMessageAt }]. */
export async function fetchConversations() {
  try {
    const r = await apiGet('/admin/conversations');
    return arrFrom(r?.data, 'conversations').map((c) => ({
      id: asString(pick(c, 'id', '')),
      itemName: pick(c, 'itemName', '') || '',
      buyerName: pick(c, 'buyerName', '') || '',
      sellerName: pick(c, 'sellerName', '') || '',
      status: pick(c, 'status', '') || '',
      messageCount: Number(pick(c, 'messageCount', 0)) || 0,
      lastMessageAt: pick(c, 'lastMessageAt', null),
    }));
  } catch {
    return [];
  }
}

/** GET /admin/conversations/{id} → { id, requestId, itemName, buyerName, sellerName, status, messages[] } or null. */
export async function fetchConversation(id) {
  try {
    const r = await apiGet(`/admin/conversations/${encodeURIComponent(id)}`);
    const d = r?.data ?? {};
    return {
      id: asString(pick(d, 'id', '')),
      requestId: asString(pick(d, 'requestId', '')),
      itemName: pick(d, 'itemName', '') || '',
      buyerName: pick(d, 'buyerName', '') || '',
      sellerName: pick(d, 'sellerName', '') || '',
      status: pick(d, 'status', '') || '',
      messages: arrFrom(d, 'messages').map((m) => ({
        id: asString(pick(m, 'id', '')),
        author: pick(m, 'author', 'buyer') || 'buyer',
        text: pick(m, 'text', '') || '',
        imageUrl: pick(m, 'imageUrl', null),
        createdAt: pick(m, 'createdAt', null),
      })),
    };
  } catch {
    return null;
  }
}
