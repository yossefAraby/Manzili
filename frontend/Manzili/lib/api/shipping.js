// Shipping + Bosta location API calls for the .NET backend.
//
// - estimateShipping(items) → POST /api/v1/shipping/estimate
//     returns { estimatedShipping, currency }.
// - fetchCities() / fetchZones(cityId) / fetchDistricts(cityId) proxy the
//     /api/v1/bosta/* endpoints, normalizing into the shapes the AddressModal
//     already consumes:
//       cities:    [{ id, name }]
//       zones:     [{ id, name, districtNames:[] }]
//       districts: [{ districtId, districtName, zoneId, zoneName }]
//
// All functions FAIL SAFE: an error or empty result returns a sensible default
// (0 / []) so the cart + address UIs render cleanly instead of throwing.

import { apiGet, apiPost } from './client';
import { hasBostaCredentials } from '@/lib/bosta/client';
import {
  fetchBostaCities,
  fetchBostaZones,
  fetchBostaDistricts,
  extractBostaList,
} from '@/lib/bosta/locations';

// Sneaky fallback: when the backend Bosta proxy is down or returns nothing,
// transparently hit Bosta directly from the browser via lib/bosta/* and
// reshape the result into the same shape the proxy would have. Only runs in
// the browser and only when a Bosta key/authorization is actually configured,
// so we never spam errors when no key is set.
function canUseBostaFallback() {
  return typeof window !== 'undefined' && hasBostaCredentials();
}

async function bostaFallback(label, directCall, normalize) {
  if (!canUseBostaFallback()) return [];
  try {
    console.warn(`[shipping] backend lookup failed, using Bosta fallback (${label})`);
    const list = await directCall();
    return (Array.isArray(list) ? list : []).map(normalize).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * POST /shipping/estimate → { estimatedShipping, currency }.
 * On failure returns { estimatedShipping: null, currency: 'EGP' } so the
 * summary shows the "…" placeholder rather than crashing.
 */
export async function estimateShipping(items) {
  const payload = {
    items: (Array.isArray(items) ? items : []).map((it) => ({
      productId: String(it.productId ?? it.id ?? ''),
      quantity: Number(it.quantity ?? 1),
      shippingSize: it.shippingSize ?? 'MEDIUM',
      shippingBulkyCategory: it.shippingBulkyCategory ?? 'NORMAL',
    })),
  };
  try {
    const res = await apiPost('/shipping/estimate', payload);
    const data = res?.data ?? res ?? {};
    return {
      estimatedShipping: data.estimatedShipping ?? data.total ?? 0,
      currency: data.currency ?? 'EGP',
    };
  } catch {
    return { estimatedShipping: null, currency: 'EGP' };
  }
}

/**
 * Estimate the Bosta delivery fee for ONE product to a buyer city — size + distance aware.
 * Returns { estimatedShipping, low, high, currency, tier, sameCity } (low/high/tier are present
 * once the backend exposes the ranged estimate; older backends return just estimatedShipping).
 * Fails safe to null so the product page just hides the widget.
 */
export async function estimateProductShipping(productId, { city, bostaCityId, quantity = 1 } = {}) {
  if (!productId) return null;
  try {
    const res = await apiPost('/shipping/estimate', {
      items: [{ productId: String(productId), quantity: Number(quantity) || 1 }],
      dropOffCity: city || undefined,
      dropOffBostaCityId: bostaCityId || undefined,
    });
    const d = res?.data ?? res ?? {};
    const n = (v) => (v == null ? null : Number(v));
    return {
      estimatedShipping: n(d.estimatedShipping ?? d.total),
      low: n(d.low),
      high: n(d.high),
      currency: d.currency ?? 'EGP',
      tier: d.tier ?? 'unknown',
      sameCity: !!d.sameCity,
    };
  } catch {
    return null;
  }
}

function normalizeCity(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw._id ?? raw.cityId;
  const name = raw.name ?? raw.cityName ?? '';
  if (!id || !name) return null;
  return { id: String(id), name: String(name) };
}

function normalizeZone(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw._id ?? raw.zoneId;
  const name = raw.name ?? raw.zoneName ?? '';
  if (!id || !name) return null;
  return {
    id: String(id),
    name: String(name),
    districtNames: Array.isArray(raw.districtNames)
      ? raw.districtNames
      : Array.isArray(raw.districts)
        ? raw.districts
        : [],
  };
}

function normalizeDistrict(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const districtId = raw.districtId ?? raw._id ?? raw.id;
  const districtName = raw.districtName ?? raw.name ?? '';
  if (!districtId || !districtName) return null;
  const zoneId = raw.zoneId ?? raw.zone?._id ?? raw.zone?.id;
  return {
    districtId: String(districtId),
    districtName: String(districtName),
    zoneId: zoneId ? String(zoneId) : '',
    zoneName: String(raw.zoneName ?? raw.zone?.name ?? ''),
  };
}

/**
 * GET /bosta/cities → [{ id, name }]. Empty / failure → [].
 * If the backend proxy errors or returns nothing, falls back to calling Bosta
 * directly from the browser (when a key is configured).
 */
export async function fetchCities() {
  try {
    const res = await apiGet('/bosta/cities');
    // The backend proxies Bosta's raw envelope through under res.data, so the
    // array lives at res.data.data.list (cities) — extractBostaList digs it out.
    const list = extractBostaList(res?.data);
    const cities = list.map(normalizeCity).filter(Boolean);
    if (cities.length) return cities;
  } catch {
    // fall through to the Bosta fallback below
  }
  return bostaFallback('cities', () => fetchBostaCities(), normalizeCity);
}

/** GET /bosta/cities/{cityId}/zones → [{ id, name, districtNames }]. */
export async function fetchZones(cityId) {
  if (!cityId) return [];
  try {
    const res = await apiGet(`/bosta/cities/${encodeURIComponent(cityId)}/zones`);
    // Bosta returns the zones array at res.data.data — extractBostaList handles it.
    const list = extractBostaList(res?.data);
    const zones = list.map(normalizeZone).filter(Boolean);
    if (zones.length) return zones;
  } catch {
    // fall through to the Bosta fallback below
  }
  return bostaFallback('zones', () => fetchBostaZones(cityId), normalizeZone);
}

/** GET /bosta/cities/{cityId}/districts → [{ districtId, districtName, zoneId, zoneName }]. */
export async function fetchDistricts(cityId) {
  if (!cityId) return [];
  try {
    const res = await apiGet(`/bosta/cities/${encodeURIComponent(cityId)}/districts`);
    // Bosta returns the districts array at res.data.data — extractBostaList handles it.
    const list = extractBostaList(res?.data);
    const districts = list.map(normalizeDistrict).filter(Boolean);
    if (districts.length) return districts;
  } catch {
    // fall through to the Bosta fallback below
  }
  return bostaFallback('districts', () => fetchBostaDistricts(cityId), normalizeDistrict);
}
