import { addressDummyData } from "@/assets/assets";
import { STORAGE_KEYS, migrateLocalStorage, readStorageItems, writeStorageEnvelope } from "@/lib/storage/localStorageEnvelope";

export function getInitialCartState() {
  const entries = readStorageItems(STORAGE_KEYS.CART);
  if (!Array.isArray(entries) || entries.length === 0) {
    return { total: 0, cartItems: {} };
  }

  const cartItems = entries.reduce((acc, item) => {
    if (item?.productId && item.quantity > 0) {
      acc[item.productId] = item.quantity;
    }
    return acc;
  }, {});
  const total = Object.values(cartItems).reduce((sum, qty) => sum + qty, 0);
  return { total, cartItems };
}

export function getInitialAddresses() {
  const list = readStorageItems(STORAGE_KEYS.ADDRESSES);
  if (Array.isArray(list) && list.length > 0) return list;
  return [addressDummyData];
}

export function bootstrapLocalStorage() {
  migrateLocalStorage();
}

export function persistReduxState(state) {
  if (!state) return;
  const cartEntries = Object.entries(state.cart?.cartItems || {}).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
  writeStorageEnvelope(STORAGE_KEYS.CART, cartEntries);
  writeStorageEnvelope(STORAGE_KEYS.ADDRESSES, state.address?.list || []);
}
