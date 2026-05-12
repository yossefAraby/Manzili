import { couponDummyData, orderDummyData, productDummyData, storesDummyData } from "@/assets/assets";

export const STORAGE_VERSION = 2;

export const STORAGE_KEYS = {
  AUTH_SESSION: "manzili_auth_session_v1",
  AUTH_USERS: "manzili_auth_users_v1",
  STORES: "manzili_stores_v1",
  PRODUCTS: "manzili_products_v1",
  CART: "manzili_cart_v1",
  CHECKOUT_DRAFTS: "manzili_checkout_drafts_v1",
  ORDERS: "manzili_orders_v1",
  ORDER_ITEMS: "manzili_order_items_v1",
  ADDRESSES: "manzili_addresses_v1",
  CUSTOM_REQUESTS: "manzili_custom_requests_v1",
  CUSTOM_REQUEST_OFFERS: "manzili_custom_request_offers_v1",
  COUPONS: "manzili_coupons_v1",
};

const DEFAULTS = {
  [STORAGE_KEYS.STORES]: storesDummyData,
  [STORAGE_KEYS.PRODUCTS]: [],
  [STORAGE_KEYS.ORDERS]: orderDummyData,
  [STORAGE_KEYS.ORDER_ITEMS]: orderDummyData.flatMap((order) => order.orderItems || []),
  [STORAGE_KEYS.ADDRESSES]: [],
  [STORAGE_KEYS.COUPONS]: couponDummyData,
  [STORAGE_KEYS.CUSTOM_REQUESTS]: [],
  [STORAGE_KEYS.CUSTOM_REQUEST_OFFERS]: [],
  [STORAGE_KEYS.CART]: [],
  [STORAGE_KEYS.CHECKOUT_DRAFTS]: [],
  [STORAGE_KEYS.AUTH_SESSION]: [],
  [STORAGE_KEYS.AUTH_USERS]: [],
};

function hasWindow() {
  return typeof window !== "undefined";
}

function envelope(items) {
  return {
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    items,
  };
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function quarantineCorruptedValue(key, rawValue) {
  if (!hasWindow()) return;
  try {
    const quarantineKey = `${key}_corrupted_${Date.now()}`;
    window.localStorage.setItem(quarantineKey, rawValue);
  } catch {
    // no-op
  }
}

function normalizeStoredValue(key, parsed) {
  if (parsed && typeof parsed === "object" && "items" in parsed) {
    const items = Array.isArray(parsed.items) ? parsed.items : parsed.items == null ? [] : [];
    return envelope(items);
  }

  if (Array.isArray(parsed)) {
    return envelope(parsed);
  }

  return envelope(DEFAULTS[key] ?? []);
}

export function readStorageEnvelope(key) {
  if (!hasWindow()) return envelope(DEFAULTS[key] ?? []);

  const raw = window.localStorage.getItem(key);
  if (!raw) return envelope(DEFAULTS[key] ?? []);

  const parsed = safeParse(raw);
  if (parsed === null) {
    quarantineCorruptedValue(key, raw);
    const fallback = envelope(DEFAULTS[key] ?? []);
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  return normalizeStoredValue(key, parsed);
}

export function writeStorageEnvelope(key, items) {
  if (!hasWindow()) return;
  const payload = envelope(items);
  window.localStorage.setItem(key, JSON.stringify(payload));
}

export function readStorageItems(key) {
  const env = readStorageEnvelope(key);
  const items = env.items;
  return Array.isArray(items) ? items : items == null ? [] : [];
}

function migrateAddressesIfNeeded() {
  if (!hasWindow()) return;
  const raw = window.localStorage.getItem(STORAGE_KEYS.ADDRESSES);
  if (!raw) return;
  const parsed = safeParse(raw);
  const fileVersion = parsed?.version;
  if (fileVersion >= STORAGE_VERSION) return;
  const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  const next = items.map((a) => ({
    ...a,
    userId: a.userId || "guest",
  }));
  writeStorageEnvelope(STORAGE_KEYS.ADDRESSES, next);
}

export function migrateLocalStorage() {
  if (!hasWindow()) return;
  migrateAddressesIfNeeded();
  Object.values(STORAGE_KEYS).forEach((key) => {
    const current = readStorageEnvelope(key);
    writeStorageEnvelope(key, Array.isArray(current.items) ? current.items : []);
  });
}

export function makeEntityId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
