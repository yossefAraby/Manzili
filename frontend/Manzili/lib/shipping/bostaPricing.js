// Client-side mirror of the backend ShippingPricingService so the product page and the
// custom-order form can show an instant Bosta delivery estimate that depends on PACKAGE SIZE
// and the DISTANCE between the seller's city and the buyer's city. Keep the constants in sync
// with backend-dotnet/.../Services/ShippingPricingService.cs. Every quote yields a RANGE,
// because the exact fee varies with the seller's precise location.

// The buyer pays only their share of the Bosta fee (the seller covers the rest). Keep in sync
// with the backend FeesOptions.ShippingBuyerShare so the product page / custom form / cart all
// show the SAME number the buyer is actually charged.
export const BUYER_SHIPPING_SHARE = 0.35;
export function buyerShare(amount) {
  return Math.round((Number(amount) || 0) * BUYER_SHIPPING_SHARE);
}

const BASE = { SMALL: 50, MEDIUM: 75, LARGE: 120 };
const BULKY = { LIGHT: 40, HEAVY: 150 };
const FACTOR = { sameCity: 1.0, sameRegion: 1.35, crossCountry: 1.85, unknown: 1.3 };
const RANGE_LOW = 0.9;
const RANGE_HIGH = 1.12;

const REGION_KEYS = [
  ['greater_cairo', ['cairo', 'giza', 'qalyub', 'shubra', 'helwan', 'obour', 'october', 'sheikh zayed', 'new cairo', 'badr', 'القاهرة', 'الجيزة', 'القليوب']],
  ['alex_west', ['alexandria', 'alex', 'beheira', 'behera', 'damanhour', 'matrouh', 'الاسكندرية', 'الإسكندرية', 'البحيرة']],
  ['delta', ['tanta', 'gharbia', 'mahalla', 'mansoura', 'dakahlia', 'zagazig', 'sharqia', 'sharkia', 'menoufia', 'monufia', 'shibin', 'kafr el sheikh', 'damietta', 'damiat', 'طنطا', 'المنصورة', 'الزقازيق', 'دمياط']],
  ['canal', ['port said', 'portsaid', 'ismailia', 'ismailiya', 'suez', 'بورسعيد', 'الاسماعيلية', 'السويس']],
  ['upper', ['aswan', 'luxor', 'qena', 'sohag', 'assiut', 'asyut', 'minya', 'minia', 'beni suef', 'fayoum', 'faiyum', 'اسوان', 'أسوان', 'الاقصر', 'الأقصر', 'قنا', 'سوهاج', 'اسيوط', 'المنيا', 'الفيوم']],
  ['sinai_redsea', ['sinai', 'arish', 'sharm', 'dahab', 'taba', 'hurghada', 'red sea', 'ghardaka', 'marsa alam', 'سيناء', 'الغردقة']],
];

const round = (v) => Math.round(v);

export function normalizeSize(s) {
  const v = String(s || '').trim().toUpperCase();
  if (v.includes('SMALL')) return 'SMALL';
  if (v.includes('LARGE') || v.includes('BULKY')) return 'LARGE';
  return 'MEDIUM';
}

function normalizeBulky(s) {
  const v = String(s || '').trim().toUpperCase();
  if (v.includes('HEAVY')) return 'HEAVY';
  if (v.includes('LIGHT')) return 'LIGHT';
  return 'NORMAL';
}

function regionOf(city) {
  const c = String(city || '').trim().toLowerCase();
  if (!c) return null;
  for (const [region, keys] of REGION_KEYS) for (const k of keys) if (c.includes(k)) return region;
  return null;
}

export function resolveTier(sellerCity, sellerBostaCityId, buyerCity, buyerBostaCityId) {
  if (sellerBostaCityId && buyerBostaCityId && String(sellerBostaCityId).trim() === String(buyerBostaCityId).trim())
    return 'sameCity';
  const s = String(sellerCity || '').trim().toLowerCase();
  const b = String(buyerCity || '').trim().toLowerCase();
  if (!s || !b) return 'unknown';
  if (s === b) return 'sameCity';
  const rs = regionOf(s);
  const rb = regionOf(b);
  if (!rs || !rb) return 'unknown';
  return rs === rb ? 'sameRegion' : 'crossCountry';
}

function pointFee(size, bulky, factor) {
  const base = BASE[normalizeSize(size)] ?? BASE.MEDIUM;
  const surcharge = normalizeBulky(bulky) === 'HEAVY' ? BULKY.HEAVY : normalizeBulky(bulky) === 'LIGHT' ? BULKY.LIGHT : 0;
  // Surcharge scales with distance too (heavy/oversized freight costs far more cross-country).
  return (base + surcharge) * factor;
}

/** Price one seller→buyer leg → { low, high, point, tier }. */
export function quoteLeg(sellerCity, sellerBostaCityId, buyerCity, buyerBostaCityId, size, bulky) {
  const tier = resolveTier(sellerCity, sellerBostaCityId, buyerCity, buyerBostaCityId);
  const point = pointFee(size, bulky, FACTOR[tier] ?? FACTOR.unknown);
  return { low: round(point * RANGE_LOW), high: round(point * RANGE_HIGH), point: round(point), tier };
}

/** Price by size alone (no known cities) → a wide range spanning same-city to cross-country. */
export function quoteBySize(size, bulky) {
  const low = pointFee(size, bulky, FACTOR.sameCity);
  const high = pointFee(size, bulky, FACTOR.crossCountry);
  const mid = pointFee(size, bulky, FACTOR.sameRegion);
  return { low: round(low * RANGE_LOW), high: round(high * RANGE_HIGH), point: round(mid), tier: 'range' };
}

/** Derive a SMALL/MEDIUM/LARGE bucket from L×W×H (cm). Null if no dimensions given. */
export function bucketFromDimensions(dims) {
  const l = Number(dims?.length) || 0;
  const w = Number(dims?.width) || 0;
  const h = Number(dims?.height) || 0;
  if (l <= 0 && w <= 0 && h <= 0) return null;
  const vol = Math.max(l, 1) * Math.max(w, 1) * Math.max(h, 1); // cm³
  if (vol < 30000) return 'SMALL';   // ~ up to 30×20×50
  if (vol < 150000) return 'MEDIUM';
  return 'LARGE';
}
