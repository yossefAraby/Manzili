import { addressDummyData, couponDummyData, orderDummyData, productDummyData, storesDummyData } from "@/assets/assets";

const STORAGE_VERSION = 1;

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
  [STORAGE_KEYS.PRODUCTS]: productDummyData,
  [STORAGE_KEYS.ORDERS]: orderDummyData,
  [STORAGE_KEYS.ORDER_ITEMS]: orderDummyData.flatMap((order) => order.orderItems || []),
  [STORAGE_KEYS.ADDRESSES]: [addressDummyData],
  [STORAGE_KEYS.COUPONS]: couponDummyData,
  [STORAGE_KEYS.CUSTOM_REQUESTS]: [],
  [STORAGE_KEYS.CUSTOM_REQUEST_OFFERS]: [],
  [STORAGE_KEYS.CART]: [],
  [STORAGE_KEYS.CHECKOUT_DRAFTS]: [],
  [STORAGE_KEYS.AUTH_SESSION]: null,
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
    // no-op: quota/permissions failure should not crash app boot
  }
}

function normalizeStoredValue(key, parsed) {
  if (parsed && typeof parsed === "object" && "items" in parsed) {
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return envelope(items);
  }

  if (Array.isArray(parsed)) {
    return envelope(parsed);
  }

  if (parsed == null && DEFAULTS[key] === null) {
    return envelope(null);
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

  const normalized = normalizeStoredValue(key, parsed);
  return normalized;
}

export function writeStorageEnvelope(key, items) {
  if (!hasWindow()) return;
  const payload = envelope(items);
  window.localStorage.setItem(key, JSON.stringify(payload));
}

export function readStorageItems(key) {
  return readStorageEnvelope(key).items;
}

export function migrateLocalStorage() {
  if (!hasWindow()) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    const current = readStorageEnvelope(key);
    if (current.version !== STORAGE_VERSION) {
      writeStorageEnvelope(key, current.items);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(current));
  });
}

export function makeEntityId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
