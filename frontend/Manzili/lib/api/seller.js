// Seller dashboard API calls + adapters for the .NET backend.
//
// Each function maps a `/api/v1/seller/*` endpoint onto the data shapes the
// existing `app/store/*` pages already consume (see each page's JSX). Every
// call is fail-safe: a network error, a `{ success:false }` envelope, or an
// empty DB must NOT crash the page. Callers pass an `onError`/fallback path or
// read the normalized empty shapes returned here.
//
// Parity gaps (NO matching /seller endpoint) are documented inline. The pages
// no longer fall back to local modules or app/api routes for these — they hide
// or no-op the affected UI gracefully:
//   - wallet release-hold              (no endpoint — UI omits the action)
//   - COD settlement / rich tx types   (only what /seller/wallet returns is shown)
//   - Stripe Connect bank onboarding GET (no endpoint — bank status not read back)
//   - custom-request offer lifecycle   (only /seller/custom-requests is surfaced)
//
// The API client returns the FULL envelope `{ success, data, ...meta }`.

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';

// ─── small helpers ───────────────────────────────────────────────────────────
const arr = (v) => (Array.isArray(v) ? v : []);

// ─── Image upload ──────────────────────────────────────────────────────────────
/**
 * Upload a single image file to the backend and return its hosted URL.
 *
 * POSTs `multipart/form-data` to `/upload` with the file under the field
 * name `image` (the client passes FormData straight through, so the browser
 * sets the multipart boundary). The backend responds with the stored URL in
 * one of the common shapes (`{ data: { url } }`, `{ url }`, or a bare string).
 * Throws ApiError on failure so callers can surface it.
 */
export async function uploadImage(file) {
  if (!file) return null;
  const form = new FormData();
  form.append('image', file);
  const r = await apiPost('/upload', form);
  const d = r?.data ?? r;
  if (typeof d === 'string') return d;
  return d?.url || d?.imageUrl || d?.src || d?.path || null;
}
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const str = (v, d = '') => (v == null ? d : String(v));

/** Pull the first usable image URL out of the many shapes the API/UI use. */
function firstImage(src) {
  if (!src) return null;
  if (typeof src === 'string') return src;
  if (Array.isArray(src)) return firstImage(src[0]);
  if (typeof src === 'object') return src.url || src.src || src['main image'] || null;
  return null;
}

function imageList(p) {
  const out = [];
  // The seller product-list DTO sends a single `mainImage` string — include it, or
  // the manage-product thumbnails fall back to a placeholder.
  const main = firstImage(p?.images) || firstImage(p?.['main image'])
    || firstImage(p?.mainImage) || firstImage(p?.image);
  if (Array.isArray(p?.images)) {
    p.images.forEach((i) => {
      const u = firstImage(i);
      if (u) out.push(u);
    });
  }
  if (out.length === 0 && main) out.push(main);
  return out;
}

// ─── Product adapter (UI Product shape) ───────────────────────────────────────
// UI shape: { id, name, description, price, mrp, images:[url], category, storeId,
//   store, inStock, stock, rating:[], variants:[{name,type,swatch,price,mrp,stock,images}],
//   material, shippingSize, shippingBulkyCategory, createdAt, updatedAt }
function adaptProduct(p, storeId) {
  if (!p || typeof p !== 'object') return null;
  // The "offer" is an optional sale price; only use it when it's a real discount
  // below the list price, else sell at the list price (a 0 sale shouldn't show as 0).
  const offerRaw = p.offerPrice ?? p['offer price'];
  const listPrice = num(p.mrp ?? p.price, 0);
  const offerNum = Number(offerRaw);
  const sellPrice = Number.isFinite(offerNum) && offerNum > 0 && offerNum < listPrice ? offerNum : listPrice;
  const cat = Array.isArray(p.category) ? p.category[0] : p.category;
  // The API returns variants GROUPED ([{ name, options:[{ value, stock, priceDelta,
  // swatch, imageUrl }] }]); the UI consumes a FLAT list ([{ type, name, swatch,
  // priceDelta, stock, image, images }]). Flatten while carrying the rich per-option
  // fields through (priceDelta surcharge, color swatch, option image) — plus tolerate
  // an already-flat payload (e.g. the optimistic patch echoed back on save).
  const variants = flattenVariants(p.variants, { sellPrice, listPrice });
  return {
    id: str(p.id),
    name: str(p.name),
    description: str(p.description),
    material: str(p.material),
    price: sellPrice,
    mrp: listPrice,
    images: imageList(p),
    category: str(cat),
    storeId: str(p.storeId ?? storeId ?? p.store?.id),
    store: p.store || null,
    inStock: p.inStock != null ? !!p.inStock : num(p.stock, 0) > 0,
    stock: num(p.stock, p.inStock === false ? 0 : 10),
    disabled: !!(p.isDisabled ?? p.disabled),
    totalSold: num(p.totalSold ?? p.sold, 0),
    rating: arr(p.rating),
    variants,
    shippingSize: str(p.shippingSize, 'MEDIUM'),
    shippingBulkyCategory: str(p.shippingBulkyCategory, 'NORMAL'),
    isPromoted: !!p.isPromoted,
    promotedUntil: p.promotedUntil || null,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
  };
}

// ─── Promotions (paid "feature my item") ─────────────────────────────────────
export async function fetchSellerPromotions() {
  try {
    const r = await apiGet('/seller/promotions');
    return arr(r?.data?.promotions).map((p) => ({
      id: str(p.id), productId: str(p.productId), plan: str(p.plan),
      amount: num(p.amount, 0), expiresAt: p.expiresAt || null,
    }));
  } catch {
    return [];
  }
}

/** Feature a product from the WALLET balance: plan 'day' (50) | 'week' (300). Throws on failure. */
export async function promoteProduct(productId, plan) {
  const r = await apiPost('/seller/promotions', { productId: str(productId), plan });
  const p = r?.data || {};
  return {
    id: str(p.id), productId: str(p.productId), plan: str(p.plan),
    amount: num(p.amount, 0), expiresAt: p.expiresAt || null,
  };
}

/**
 * Start a "feature my product" payment by method:
 *   - 'wallet'  → charges the available balance now; returns { status:'active', expiresAt }.
 *   - 'kashier' → mobile wallet; returns { status:'redirect', url } (open it).
 *   - 'stripe'  → card;          returns { status:'redirect', url } (open it).
 * Throws ApiError on failure (e.g. 402 INSUFFICIENT_WALLET_BALANCE) so the modal can surface it.
 */
export async function promotionCheckout(productId, plan, method = 'wallet') {
  const r = await apiPost('/seller/promotions/checkout', { productId: str(productId), plan, method });
  const d = r?.data || {};
  return {
    status: str(d.status),
    method: str(d.method),
    url: d.url || null,
    expiresAt: d.expiresAt || null,
  };
}

/** Confirm a promotion gateway return. Stripe: pass { gateway:'stripe', sessionId }. Kashier: pass
 *  { gateway:'kashier', productId, plan, query }. Returns { status } ('paid' on success). */
export async function confirmPromotion({ gateway, productId, plan, query, sessionId } = {}) {
  const r = await apiPost('/seller/promotions/confirm', {
    gateway, productId: productId != null ? str(productId) : undefined, plan, query, sessionId,
  });
  return { status: str(r?.data?.status, 'unpaid') };
}

// Normalize either a GROUPED variant payload (API: [{ name, options:[...] }]) or an
// already-FLAT one (optimistic patch: [{ type, name, ... }]) into the UI flat shape.
function flattenVariants(variants, { sellPrice = 0, listPrice = 0 } = {}) {
  const list = arr(variants);
  if (list.length === 0) return [];
  // Grouped if any entry carries an `options` array.
  const grouped = list.some((g) => Array.isArray(g?.options));
  if (grouped) {
    const flat = [];
    list.forEach((group) => {
      const type = str(group?.name ?? group?.type);
      arr(group?.options).forEach((opt) => {
        const image = firstImage(opt?.imageUrl) || firstImage(opt?.image) || null;
        const priceDelta = num(opt?.priceDelta, 0);
        flat.push({
          name: str(opt?.value ?? opt?.name),
          type,
          swatch: opt?.swatch ?? null,
          priceDelta,
          // Mirror into `price` so the surcharge survives normalizeProduct() (which
          // preserves `price` but drops unknown fields like priceDelta).
          price: priceDelta,
          stock: num(opt?.stock, 0),
          image,
          images: image ? [image] : [],
        });
      });
    });
    return flat;
  }
  // Already flat.
  return list.map((v) => {
    const image = firstImage(v?.imageUrl) || firstImage(v?.image) || firstImage(v?.images) || null;
    // Tolerate the delta arriving as priceDelta OR the mirrored `price` (post-normalize).
    const priceDelta = num(v.priceDelta ?? v.price, 0);
    return {
      name: str(v.name),
      type: str(v.type),
      swatch: v.swatch ?? null,
      priceDelta,
      price: priceDelta,
      stock: num(v.stock, 0),
      image,
      images: image ? [image] : imageList(v),
    };
  });
}

// ─── Order adapter (UI StoreOrder shape used by orders/returns pages) ──────────
// UI reads: { id, total, status, paymentMethod, isPaid, createdAt, updatedAt,
//   orderItems:[{ quantity, price, product:{ name, images, category } }],
//   order:{ address, isCouponUsed, coupon:{code} }, shipment:{ trackingNumber } }
function adaptOrderItem(it) {
  const prod = it.product || {};
  return {
    productId: str(it.productId ?? prod.id),
    quantity: num(it.quantity, 1),
    // The seller order DTO sends the snapshot price as `unitPrice` (older shapes used `price`).
    price: num(it.unitPrice ?? it.price, 0),
    name: str(it.name ?? prod.name),
    image: firstImage(it.imageUrl) || firstImage(it.image) || firstImage(prod.images),
    product: {
      id: str(prod.id ?? it.productId),
      name: str(prod.name ?? it.name),
      images: imageList(prod),
      category: str(Array.isArray(prod.category) ? prod.category[0] : prod.category),
    },
  };
}

// Pass the full Bosta shipment shape through (incl. ordered events timeline) so
// the TrackingTimeline component can render it. Tolerates snake/camel keys.
function adaptShipment(s) {
  if (!s || typeof s !== 'object') return null;
  const events = arr(s.events).map((e) => ({
    type: e?.type ?? e?.eventType ?? e?.event_type ?? null,
    description: str(e?.description ?? e?.desc),
    occurredAt: e?.occurredAt ?? e?.occurred_at ?? e?.timestamp ?? e?.date ?? null,
  }));
  return {
    trackingNumber: str(s.trackingNumber ?? s.tracking_number),
    carrier: str(s.carrier, 'BOSTA'),
    status: s.status ?? null,
    statusText: s.statusText ?? s.status_text ?? null,
    awbUrl: s.awbUrl ?? s.awb_url ?? null,
    shippingCost: s.shippingCost ?? s.shipping_cost ?? null,
    codAmount: s.codAmount ?? s.cod_amount ?? null,
    shippedAt: s.shippedAt ?? s.shipped_at ?? null,
    deliveredAt: s.deliveredAt ?? s.delivered_at ?? null,
    events,
  };
}

function adaptStoreOrder(o) {
  if (!o || typeof o !== 'object') return null;
  const order = o.order || {};
  const address = order.address || o.address || null;
  const coupon = order.coupon || o.coupon || null;
  return {
    id: str(o.id),
    total: num(o.total, 0),
    // The seller endpoint returns the status lower-cased; the UI compares against the
    // canonical UPPER_SNAKE values (ORDER_PLACED, PROCESSING, SHIPPED…), so normalize here.
    status: str(o.status, 'ORDER_PLACED').toUpperCase(),
    paymentMethod: str(o.paymentMethod, 'COD'),
    isPaid: !!o.isPaid,
    createdAt: o.createdAt || new Date().toISOString(),
    updatedAt: o.updatedAt || o.createdAt || new Date().toISOString(),
    orderItems: arr(o.orderItems).map(adaptOrderItem),
    order: {
      address,
      isCouponUsed: !!(order.isCouponUsed ?? o.isCouponUsed ?? coupon),
      coupon: coupon ? { code: str(coupon.code ?? coupon) } : null,
    },
    shipment: adaptShipment(o.shipment),
  };
}

// ─── Coupon adapter (UI Coupon shape) ──────────────────────────────────────────
// UI shape: { code, description, discount, scope, storeId, productIds:[],
//   expiresAt, maxUsers, usedCount, createdBy, createdAt }
function adaptCoupon(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    code: str(c.code).toUpperCase(),
    description: str(c.description),
    discount: num(c.discount, 0),
    scope: str(c.scope, 'STORE'),
    storeId: c.storeId != null ? str(c.storeId) : null,
    productIds: arr(c.productIds).map(str),
    expiresAt: c.expiresAt || c.expiry || null,
    maxUsers: num(c.maxUsers, 0),
    usedCount: num(c.usedCount, 0),
    createdBy: str(c.createdBy, 'STORE'),
    createdAt: c.createdAt || new Date().toISOString(),
  };
}

// ─── Wallet adapter (UI wallet page shape) ─────────────────────────────────────
// UI reads wallet.{ availableBalance, pendingBalance, currency } and a flat
// transactions[] of { id, type, bucket, amount, createdAt }.
function adaptWallet(w) {
  const wallet = w?.wallet || w || {};
  const bank = w?.bankDetails || wallet.bankDetails || null;
  return {
    wallet: {
      id: str(wallet.id),
      storeId: str(wallet.storeId),
      availableBalance: num(wallet.availableBalance, 0),
      pendingBalance: num(wallet.pendingBalance, 0),
      currency: str(wallet.currency, 'EGP'),
    },
    // Persisted payout/financial details (masked) so the wallet UI reflects saved state.
    bankDetails: bank
      ? {
          bankName: str(bank.bankName),
          accountHolder: str(bank.accountHolder),
          last4: str(bank.last4 ?? bank.bankLast4),
          configured: Boolean(bank.configured ?? (bank.last4 || bank.bankName)),
        }
      : null,
    transactions: arr(w?.transactions ?? wallet.transactions).map((t) => ({
      id: str(t.id),
      type: str(t.type, 'ADJUSTMENT'),
      bucket: str(t.bucket, 'AVAILABLE'),
      amount: num(t.amount, 0),
      createdAt: t.createdAt || new Date().toISOString(),
    })),
  };
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
// UI dashboard shape: { totalProducts, totalEarnings, totalOrders, ratings:[] }
export async function fetchDashboard() {
  const r = await apiGet('/seller/dashboard');
  const d = r?.data || {};
  return {
    totalProducts: num(d.totalProducts ?? d.productsCount, 0),
    totalEarnings: num(d.totalEarnings ?? d.earnings ?? d.totalRevenue, 0),
    totalOrders: num(d.totalOrders ?? d.ordersCount, 0),
    ratings: arr(d.ratings).map((rv) => ({
      id: str(rv.id),
      rating: num(rv.rating, 0),
      review: str(rv.review ?? rv.comment),
      createdAt: rv.createdAt || new Date().toISOString(),
      productId: str(rv.productId ?? rv.product?.id),
      product: rv.product
        ? {
            id: str(rv.product.id),
            name: str(rv.product.name),
            category: str(
              Array.isArray(rv.product.category) ? rv.product.category[0] : rv.product.category,
            ),
          }
        : null,
      user: {
        name: str(rv.user?.name, 'Customer'),
        image: firstImage(rv.user?.image) || '/favicon.ico',
      },
    })),
  };
}

// ─── Products ────────────────────────────────────────────────────────────────
export async function fetchSellerProducts() {
  const r = await apiGet('/seller/products');
  const list = arr(r?.data?.products ?? r?.data?.ProductCards ?? r?.data);
  return list.map((p) => adaptProduct(p)).filter(Boolean);
}

// Seller-scoped single product (disabled or not) for the edit form prefill.
export async function fetchSellerProduct(id) {
  const r = await apiGet(`/seller/products/${encodeURIComponent(id)}`);
  return adaptProduct(r?.data);
}

export async function createSellerProduct(payload) {
  const r = await apiPost('/seller/products', payload);
  return adaptProduct(r?.data) || adaptProduct(payload);
}

export async function updateSellerProduct(id, payload) {
  const r = await apiPut(`/seller/products/${encodeURIComponent(id)}`, payload);
  return adaptProduct(r?.data) || adaptProduct({ id, ...payload });
}

// Enable/disable (hide) a product — the REAL status toggle, distinct from stock.
export async function setSellerProductStatus(id, disabled) {
  const r = await apiPatch(`/seller/products/${encodeURIComponent(id)}/status`, { disabled: !!disabled });
  return adaptProduct(r?.data) || { id: str(id), disabled: !!disabled };
}

export async function deleteSellerProduct(id) {
  await apiDelete(`/seller/products/${encodeURIComponent(id)}`);
  return { id: str(id) };
}

// ─── Orders ──────────────────────────────────────────────────────────────────
export async function fetchSellerOrders() {
  const r = await apiGet('/seller/orders');
  const list = arr(r?.data?.storeOrders ?? r?.data?.orders ?? r?.data);
  return list.map(adaptStoreOrder).filter(Boolean);
}

export async function updateOrderStatus(id, status) {
  const r = await apiPatch(`/seller/orders/${encodeURIComponent(id)}/status`, { status });
  return adaptStoreOrder(r?.data) || { id: str(id), status: str(status) };
}

// ─── Coupons ─────────────────────────────────────────────────────────────────
export async function fetchCoupons() {
  const r = await apiGet('/seller/coupons');
  const list = arr(r?.data?.coupons ?? r?.data);
  return list.map(adaptCoupon).filter(Boolean);
}

export async function createCoupon(payload) {
  const r = await apiPost('/seller/coupon', payload);
  return adaptCoupon(r?.data) || adaptCoupon(payload);
}

export async function deleteCoupon(code) {
  // Backend exposes a singular `/seller/coupon` route; delete by code.
  await apiDelete(`/seller/coupon/${encodeURIComponent(code)}`);
  return { code: str(code).toUpperCase() };
}

export async function validateCoupon(code) {
  const r = await apiGet(`/seller/coupon?code=${encodeURIComponent(code)}`);
  return adaptCoupon(r?.data);
}

// ─── Settings ────────────────────────────────────────────────────────────────
// UI settings page works on a local store record. The API exposes a settings
// blob; we adapt it onto the same field names the page reads.
function adaptSettings(s) {
  const d = s || {};
  return {
    id: str(d.id ?? d.storeId),
    name: str(d.name),
    username: str(d.username),
    description: str(d.description),
    email: str(d.email),
    contact: str(d.contact ?? d.phone),
    logo: firstImage(d.logo ?? d.image) || null,
    address: str(d.address),
    addressDetails: d.addressDetails || null,
  };
}

export async function fetchSettings() {
  const r = await apiGet('/seller/settings');
  return adaptSettings(r?.data);
}

export async function updateSettings(payload) {
  const r = await apiPut('/seller/settings', payload);
  return adaptSettings(r?.data) || adaptSettings(payload);
}

// ─── Warehouses (seller pickup locations) ──────────────────────────────────────
// A seller can keep several warehouses; Bosta collects each order from the default
// one. UI shape: { id, label, firstLine, city, phone, contactName, bostaCityId,
//   bostaZoneId, bostaDistrictId, isDefault, createdAt }.
function adaptWarehouse(w) {
  if (!w || typeof w !== 'object') return null;
  return {
    id: str(w.id),
    label: str(w.label),
    firstLine: str(w.firstLine),
    city: str(w.city),
    phone: str(w.phone),
    contactName: str(w.contactName),
    bostaCityId: w.bostaCityId ?? null,
    bostaZoneId: w.bostaZoneId ?? null,
    bostaDistrictId: w.bostaDistrictId ?? null,
    isDefault: !!w.isDefault,
    createdAt: w.createdAt || null,
  };
}

export async function fetchWarehouses() {
  const r = await apiGet('/seller/warehouses');
  const list = arr(r?.data?.warehouses ?? r?.data);
  return list.map(adaptWarehouse).filter(Boolean);
}

export async function createWarehouse(payload) {
  const r = await apiPost('/seller/warehouses', payload);
  return adaptWarehouse(r?.data) || adaptWarehouse(payload);
}

export async function updateWarehouse(id, payload) {
  const r = await apiPut(`/seller/warehouses/${encodeURIComponent(id)}`, payload);
  return adaptWarehouse(r?.data) || adaptWarehouse({ id, ...payload });
}

export async function setDefaultWarehouse(id) {
  await apiPost(`/seller/warehouses/${encodeURIComponent(id)}/default`, {});
  return { id: str(id) };
}

export async function deleteWarehouse(id) {
  await apiDelete(`/seller/warehouses/${encodeURIComponent(id)}`);
  return { id: str(id) };
}

// ─── Wallet ──────────────────────────────────────────────────────────────────
export async function fetchWallet() {
  const r = await apiGet('/seller/wallet');
  return adaptWallet(r?.data);
}

export async function requestPayout(amount) {
  const r = await apiPost('/seller/wallet/payout', { amount: num(amount, 0) });
  const d = r?.data || {};
  return {
    ok: true,
    message: str(d.message, 'Payout request recorded.'),
    requestedAmount: num(d.requestedAmount ?? amount, 0),
    currency: str(d.currency, 'EGP'),
  };
}

export async function updateBankDetails(payload) {
  // Backend route is POST /seller/wallet/bank-details (financial details are stored in our
  // backend — chosen over Stripe Connect for modularity; only the last 4 digits are kept).
  const r = await apiPost('/seller/wallet/bank-details', payload);
  const d = r?.data || {};
  return {
    ok: true,
    message: str(d.message, 'Bank details updated.'),
    bankName: str(d.bankName ?? payload?.bankName),
    bankLast4: str(d.bankLast4 ?? (payload?.accountNumber || '').slice(-4)),
    stripeAccountId: d.stripeAccountId ?? null,
  };
}

// ─── Returns ─────────────────────────────────────────────────────────────────
// UI returns page reads { returns:[StoreOrder], totalRefunded }.
export async function fetchReturns() {
  const r = await apiGet('/seller/returns');
  const list = arr(r?.data?.returns ?? r?.data);
  const returns = list.map(adaptStoreOrder).filter(Boolean);
  const totalRefunded =
    r?.data?.totalRefunded != null
      ? num(r.data.totalRefunded, 0)
      : returns.reduce((sum, o) => sum + num(o.total, 0), 0);
  return { returns, totalRefunded };
}

export async function processReturn(orderId, reason) {
  const r = await apiPost(`/seller/orders/${encodeURIComponent(orderId)}/return`, { reason });
  return adaptStoreOrder(r?.data) || { id: str(orderId), status: 'RETURNED' };
}

// ─── Custom requests (seller view) ─────────────────────────────────────────────
// The seller custom-order page lists the requests this seller is involved in.
// The API `/seller/custom-requests` returns those requests; we surface them in
// a tolerant shape. The full offer negotiation lifecycle (accept/decline/
// messages/milestones) has NO seller endpoint yet — the page renders whatever
// `offer` blob the request carries and omits the rest (parity gap).
export async function fetchSellerCustomRequests() {
  const r = await apiGet('/seller/custom-requests');
  const list = arr(r?.data?.requests ?? r?.data);
  return list.map((req) => ({
    id: str(req.id),
    itemName: str(req.itemName ?? req.title),
    images: imageList(req),
    category: str(Array.isArray(req.category) ? req.category[0] : req.category),
    createdAt: req.createdAt || new Date().toISOString(),
    updatedAt: req.updatedAt || req.createdAt || null,
    user: req.user ? { name: str(req.user.name) } : null,
    offer: req.offer || req.activeOffer || null,
  }));
}

export {
  adaptProduct,
  adaptStoreOrder,
  adaptCoupon,
  adaptWallet,
  adaptSettings,
};
