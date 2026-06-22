// Store (catalog) API calls for the .NET backend + adapters onto the UI store shape.
//
// The UI store-profile page (app/(public)/shop/[username]) reads:
//   { id, name, description, username, address, email, contact, logo }
// The API StoreDetailDto provides:
//   { id, name, logo, description, location, email, phone, rating, totalProducts, totalReviews }
// so we map location->address, phone->contact, and default the missing username.
//
// Fail-safe: functions THROW on error; callers fall back to the local store registry.

import { apiGet, apiPost } from './client';
import { adaptProductCard } from './products';

/** Map an API StoreDetailDto into the UI store shape the profile page consumes. */
export function adaptStore(dto, { username } = {}) {
  if (!dto || typeof dto !== 'object') return null;
  return {
    id: String(dto.id ?? ''),
    name: dto.name || '',
    description: dto.description || '',
    // API has no username; keep the slug the page navigated with so links stay stable.
    username: dto.username || username || '',
    address: dto.location || dto.address || '',
    email: dto.email || '',
    contact: dto.phone || dto.contact || '',
    logo: dto.logo || null,
    rating: Number(dto.rating) || 0,
    totalProducts: dto.totalProducts ?? 0,
    totalReviews: dto.totalReviews ?? 0,
    status: 'approved',
    isActive: true,
  };
}

/** Fetch a store by id. Returns the UI store shape (or null). Throws on failure. */
export async function fetchStore(id, opts = {}) {
  const r = await apiGet(`/store/${encodeURIComponent(id)}`);
  return adaptStore(r?.data, opts);
}

/**
 * GET /stores/by-username/{username} → the UI store shape (or null on failure).
 * Fail-safe (returns null) so callers can fall through to a not-found state.
 */
export async function fetchStoreByUsername(username) {
  if (!username) return null;
  try {
    const r = await apiGet(`/stores/by-username/${encodeURIComponent(username)}`);
    return adaptStore(r?.data, { username });
  } catch {
    return null;
  }
}

/**
 * Fetch a store's products. Returns { items, total } where items are UI products.
 * Throws ApiError on failure.
 */
export async function fetchStoreProducts(id, { page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  const r = await apiGet(`/store/${encodeURIComponent(id)}/products?${params.toString()}`);
  const products = r?.data?.products || [];
  return {
    items: products.map(adaptProductCard).filter(Boolean),
    total: r?.total ?? products.length,
  };
}

/**
 * GET /store/{id}/custom-work → completed custom pieces for the store profile's
 * "Custom Work" section. Each item: { id, productName, image, rating, reviewText, completedAt }.
 * Fail-safe: returns [] on any error so the section simply hides when empty/unavailable.
 */
export async function fetchStoreCustomWork(id) {
  if (!id) return [];
  try {
    const r = await apiGet(`/store/${encodeURIComponent(id)}/custom-work`);
    const raw = (r?.data && (r.data.customWork ?? r.data.CustomWork)) ?? r?.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((x) => ({
        id: String(x?.id ?? ''),
        productName: x?.productName || x?.ProductName || 'Custom piece',
        image: x?.image || x?.Image || null,
        rating: Number(x?.rating ?? x?.Rating) || 0,
        reviewText: x?.reviewText || x?.ReviewText || '',
        completedAt: x?.completedAt || x?.CompletedAt || null,
      }))
      .filter((x) => x.id);
  } catch {
    return [];
  }
}

/**
 * Apply to open a store. Body: { name, description, email, phone, logo, address }.
 * Returns the success message string. Throws ApiError on failure.
 */
export async function applyForStore(payload = {}) {
  const body = {
    name: payload.name || '',
    description: payload.description || '',
    email: payload.email || '',
    phone: payload.phone || payload.contact || '',
    logo: payload.logo || '',
    address: payload.address || '',
    // Store handle → /shop/{username} links. Without this the approved store has no
    // username and its profile link 404s ("Store not found").
    username: payload.username || '',
    // Owner's national-ID photo (hosted URL) → admin verification review board.
    nationalIdImage: payload.nationalIdImage || '',
    // Structured pickup → seeds the seller's first (default) warehouse server-side.
    pickup: payload.pickup || null,
  };
  const r = await apiPost('/stores/apply', body);
  return r?.message || 'Store application submitted';
}

/**
 * The current user's own store-application / verification status.
 * Fail-safe: returns { hasApplication:false } on any error so the page can show the apply form.
 */
export async function fetchMyApplication() {
  try {
    const r = await apiGet('/stores/my-application');
    const d = r?.data || {};
    return {
      hasApplication: !!d.hasApplication,
      status: d.status || null, // pending | approved | rejected | deleted
      isActive: !!d.isActive,
      storeId: d.storeId != null ? String(d.storeId) : null,
      name: d.name || '',
    };
  } catch {
    return { hasApplication: false, status: null, isActive: false, storeId: null, name: '' };
  }
}
