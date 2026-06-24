// Shared coupon adapter used by BOTH the seller dashboard (lib/api/seller.js) and the admin
// dashboard (lib/api/admin.js). Coupons come from two backend DTOs with slightly different field
// names (discount vs discountPercentage, expiryDate vs expiredDate, isActive vs active), so this
// single reader tolerates either naming and produces one canonical UI coupon shape:
//   { id, code, description, discount, scope, storeId, productIds, expiresAt,
//     maxUsers, usedCount, active, createdBy, createdAt }
// This is the "same/similar code for both" the coupon UIs share.

const s = (v, d = '') => (v == null ? d : String(v));
const n = (v, d = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
const a = (v) => (Array.isArray(v) ? v : []);

export function adaptCoupon(c) {
  if (!c || typeof c !== 'object') return null;
  const discount = c.discount ?? c.discountPercentage;
  const expiresAt = c.expiresAt ?? c.expiryDate ?? c.expiredDate ?? c.expiry ?? null;
  const active = c.isActive ?? c.active ?? true;
  return {
    id: c.id != null ? s(c.id) : null,
    code: s(c.code).toUpperCase(),
    description: s(c.description),
    discount: n(discount, 0),
    scope: s(c.scope, 'STORE'),
    storeId: c.storeId != null ? s(c.storeId) : null,
    productIds: a(c.productIds).map((x) => s(x)),
    expiresAt,
    maxUsers: n(c.maxUsers, 0),
    usedCount: n(c.usedCount, 0),
    active: !!active,
    createdBy: s(c.createdBy, 'STORE'),
    createdAt: c.createdAt || null,
  };
}
