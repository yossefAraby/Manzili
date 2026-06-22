// Ratings (reviews) API calls for the .NET backend + adapters onto the UI rating shape.
//
// The UI (ProductDescription / ratingSlice) consumes ratings shaped like:
//   { id, rating, review, user:{ name, image }, productId, createdAt }
// The API ReviewDto is:
//   { id, rating, text, userName, date }
// so we map text->review, userName->user.name, date->createdAt.
//
// NOTE: the API's POST /ratings body is { productId, rating, review } and does NOT
// accept orderId — see the parity gap noted in the migration report.
//
// Fail-safe: functions THROW on error; callers may fall back to the local /api/ratings route.

import { apiGet, apiPost } from './client';

/** Map an API ReviewDto into the UI rating shape. */
export function adaptRating(dto, { productId } = {}) {
  if (!dto || typeof dto !== 'object') return null;
  return {
    id: String(dto.id ?? ''),
    rating: Number(dto.rating) || 0,
    review: dto.text ?? dto.review ?? '',
    user: {
      name: dto.userName || dto.user?.name || '',
      image: dto.user?.image || null,
    },
    productId: dto.productId || productId || null,
    createdAt: dto.date || dto.createdAt || null,
  };
}

/**
 * Fetch ratings for a product. The API REQUIRES a productId query param, so calling
 * without one returns [] (the UI uses this only on the product page).
 * Returns UI-shaped ratings. Throws ApiError on a real failure.
 */
export async function fetchRatings(productId) {
  if (!productId) return [];
  const r = await apiGet(`/ratings?productId=${encodeURIComponent(productId)}`);
  const items = Array.isArray(r?.data) ? r.data : (r?.data?.items || []);
  return items.map((x) => adaptRating(x, { productId })).filter(Boolean);
}

/**
 * Create a rating. Body sent to API: { productId, rating, review } (orderId is ignored
 * by the API — kept in the signature for caller compatibility).
 * Returns the created rating in UI shape. Throws ApiError on failure.
 */
export async function createRating({ productId, orderId, rating, review } = {}) {
  const r = await apiPost('/ratings', { productId, rating, review: review || '' });
  const created = adaptRating(r?.data, { productId });
  return created || { id: '', rating, review: review || '', user: { name: '', image: null }, productId, createdAt: new Date().toISOString() };
}
