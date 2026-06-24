// Account-linked cart API + mapping between the Redux cart shape and the backend's.
//
// The cart is persisted server-side per account (GET/PUT/merge/DELETE /cart), so a logged-in
// buyer's cart survives logout and follows them across devices — nothing user-specific stays
// browser-local. Guests still keep a local cart; on login it's MERGED into the account cart.
//
// Backend line shape:  { productId:int, quantity:int, variant:string|null }
//   `variant` is the serialized variants object (JSON) so the exact option is remembered.
// Redux line shape:    cartItems["<id>::<variantKey>"] = { productId, quantity, variantKey, variants }

import { apiGet, apiPut, apiPost, apiDelete } from './client';
import { serializeVariants, makeCartKey } from '@/lib/features/cart/cartSlice';

/** Redux cartItems map → backend items array. */
export function cartItemsToServer(cartItems) {
  return Object.values(cartItems || {})
    .map((it) => ({
      productId: Number(it.productId),
      quantity: Number(it.quantity) || 1,
      variant:
        it.variants && Object.keys(it.variants).length > 0 ? JSON.stringify(it.variants) : null,
    }))
    .filter((it) => Number.isFinite(it.productId) && it.productId > 0);
}

/** Backend items array → Redux { cartItems, total }. */
export function serverItemsToCart(items) {
  const cartItems = {};
  let total = 0;
  for (const it of Array.isArray(items) ? items : []) {
    let variants = {};
    if (it?.variant) {
      try { variants = JSON.parse(it.variant) || {}; } catch { variants = {}; }
    }
    const productId = String(it.productId);
    const quantity = Number(it.quantity) || 1;
    const key = makeCartKey(productId, variants);
    cartItems[key] = { productId, quantity, variantKey: serializeVariants(variants), variants };
    total += quantity;
  }
  return { cartItems, total };
}

/** Load the account cart. Returns { cartItems, total } or null on error. */
export async function fetchServerCart() {
  try {
    const r = await apiGet('/cart');
    return serverItemsToCart(r?.data?.items);
  } catch {
    return null;
  }
}

/** Replace the account cart with the current Redux cart (fire-and-forget; never throws). */
export async function saveServerCart(cartItems) {
  try {
    await apiPut('/cart', { items: cartItemsToServer(cartItems) });
    return true;
  } catch {
    return false;
  }
}

/** Merge a guest cart into the account cart (summing quantities). Returns the unified { cartItems, total } or null. */
export async function mergeServerCart(cartItems) {
  try {
    const r = await apiPost('/cart/merge', { items: cartItemsToServer(cartItems) });
    return serverItemsToCart(r?.data?.items);
  } catch {
    return null;
  }
}

/** Empty the account cart (e.g. after a successful order). Never throws. */
export async function clearServerCart() {
  try {
    await apiDelete('/cart');
    return true;
  } catch {
    return false;
  }
}
