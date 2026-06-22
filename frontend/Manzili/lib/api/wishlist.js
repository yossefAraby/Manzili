// Wishlist API calls + adapters for the .NET backend.
//
// The backend exposes:
//   GET    /wishlist               -> { data: { wishlistCards:[ productCard ] }, total? }
//   POST   /wishlist/{productId}    -> { data: { message } }
//   DELETE /wishlist/{productId}    -> { data: { message } }
//   DELETE /wishlist                -> { data: { message } }  (clear all)
//
// The Redux slice tracks wishlist membership as a map `wishlistItems: { [productId]: true }`
// (plus a `total`). The wishlist PAGE cross-references `state.product.list`, so it only needs
// the set of product ids that are wishlisted. We therefore adapt `wishlistCards` down to the
// list of product-id strings the slice consumes.
//
// All calls are auth-only. We fail safe: a logged-out user (no token / 401) yields an empty
// set rather than throwing, so guest pages render the empty state cleanly.

import { apiGet, apiPost, apiDelete } from './client';
import { isAuthed } from './authState';

/** Extract the set of wishlisted product ids from the API's wishlistCards array. */
function adaptWishlistIds(payload) {
  const cards = payload?.wishlistCards;
  if (!Array.isArray(cards)) return [];
  return cards
    .map((c) => (c && c.id != null ? String(c.id) : null))
    .filter(Boolean);
}

/**
 * Fetch the current user's wishlist. Returns an array of product-id strings.
 * Returns [] for guests or on any failure (fail safe).
 */
export async function fetchWishlist() {
  if (!isAuthed()) return [];
  try {
    const res = await apiGet('/wishlist');
    return adaptWishlistIds(res?.data);
  } catch {
    return [];
  }
}

/**
 * Add a product to the wishlist. Returns true on success, false otherwise.
 * No-op (returns false) for guests so the optimistic local toggle still works.
 */
export async function addToWishlist(productId) {
  if (!isAuthed() || !productId) return false;
  try {
    await apiPost(`/wishlist/${encodeURIComponent(productId)}`);
    return true;
  } catch {
    return false;
  }
}

/** Remove a product from the wishlist. Returns true on success, false otherwise. */
export async function removeFromWishlist(productId) {
  if (!isAuthed() || !productId) return false;
  try {
    await apiDelete(`/wishlist/${encodeURIComponent(productId)}`);
    return true;
  } catch {
    return false;
  }
}

/** Clear the entire wishlist. Returns true on success, false otherwise. */
export async function clearWishlist() {
  if (!isAuthed()) return false;
  try {
    await apiDelete('/wishlist');
    return true;
  } catch {
    return false;
  }
}
