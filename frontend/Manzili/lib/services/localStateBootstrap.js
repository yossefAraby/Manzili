import {
  STORAGE_KEYS,
  migrateLocalStorage,
  readStorageItems,
  writeStorageEnvelope,
} from "@/lib/storage/localStorageEnvelope";

// This module handles only client-side CART persistence (and a couple of legacy
// address helpers). Auth is NOT stored on the client at all — the session lives in
// httpOnly cookies and is rehydrated from GET /auth/me on load. Addresses,
// notifications, stores, products, etc. all live in the .NET API.

export function getInitialCartState() {
  const entries = readStorageItems(STORAGE_KEYS.CART);
  if (!Array.isArray(entries) || entries.length === 0) {
    return { total: 0, cartItems: {} };
  }

  const cartItems = {};
  let total = 0;

  for (const item of entries) {
    if (!item?.productId || item.quantity <= 0) continue;

    // New format with variantKey
    if (item.variantKey !== undefined) {
      const key = item.variantKey
        ? `${item.productId}::${item.variantKey}`
        : `${item.productId}::`;
      cartItems[key] = {
        productId: item.productId,
        quantity: item.quantity,
        variantKey: item.variantKey || "",
        variants: item.variants || {},
      };
    } else {
      // Legacy format — just productId + quantity, no variants
      const key = `${item.productId}::`;
      cartItems[key] = {
        productId: item.productId,
        quantity: item.quantity,
        variantKey: "",
        variants: {},
      };
    }
    total += item.quantity;
  }

  return { total, cartItems };
}

export function loadAddressesForUser(userId) {
  const uid = userId || "guest";
  const list = readStorageItems(STORAGE_KEYS.ADDRESSES);
  if (!Array.isArray(list)) return [];
  return list
    .filter((a) => (a.userId || "guest") === uid)
    .map((a) => ({ ...a, userId: a.userId || "guest" }));
}

export function persistAddressesForUser(userId, addressList) {
  const uid = userId || "guest";
  const all = readStorageItems(STORAGE_KEYS.ADDRESSES);
  const others = (Array.isArray(all) ? all : []).filter((a) => (a.userId || "guest") !== uid);
  const tagged = (addressList || []).map((a) => ({ ...a, userId: uid }));
  writeStorageEnvelope(STORAGE_KEYS.ADDRESSES, [...others, ...tagged]);
}

export function bootstrapLocalStorage() {
  migrateLocalStorage();
}

export function persistReduxState(state) {
  if (!state) return;
  const cartEntries = Object.entries(state.cart?.cartItems || {}).map(
    ([, item]) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantKey: item.variantKey || "",
      variants: item.variants || {},
    }),
  );
  // Only the cart is persisted locally. The auth session is cookie-backed and is
  // never written to local/session storage.
  writeStorageEnvelope(STORAGE_KEYS.CART, cartEntries);
}
