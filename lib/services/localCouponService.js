import { couponDummyData } from "@/assets/assets";
import { normalizeCouponCode } from "@/lib/couponUtils";
import { STORAGE_KEYS, readStorageItems, writeStorageEnvelope } from "@/lib/storage/localStorageEnvelope";

export async function listCoupons() {
  const coupons = readStorageItems(STORAGE_KEYS.COUPONS);
  if (Array.isArray(coupons) && coupons.length > 0) return coupons;
  writeStorageEnvelope(STORAGE_KEYS.COUPONS, couponDummyData);
  return couponDummyData;
}

export async function getCouponByCode(code) {
  const normalized = normalizeCouponCode(code);
  const coupons = await listCoupons();
  return coupons.find((coupon) => coupon.code === normalized) ?? null;
}

export async function createCoupon(input) {
  const coupons = await listCoupons();
  const next = [input, ...coupons];
  writeStorageEnvelope(STORAGE_KEYS.COUPONS, next);
  return input;
}

export async function removeCoupon(code) {
  const coupons = await listCoupons();
  const normalized = normalizeCouponCode(code);
  const next = coupons.filter((coupon) => coupon.code !== normalized);
  writeStorageEnvelope(STORAGE_KEYS.COUPONS, next);
  return next;
}
