import { productDummyData } from "@/assets/assets";
import {
  findStoreById,
  findStoreByOwnerUserId,
  upsertStoreRecord,
} from "@/lib/services/localStoreRegistry";
import {
  STORAGE_KEYS,
  migrateLocalStorage,
  readStorageItems,
  writeStorageEnvelope,
} from "@/lib/storage/localStorageEnvelope";

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

export function readAuthSession() {
  const items = readStorageItems(STORAGE_KEYS.AUTH_SESSION);
  if (Array.isArray(items) && items[0]?.userId) return items[0];
  return null;
}

/**
 * Restores session from storage only when the user still exists in AUTH_USERS,
 * clears orphan rows (broken or legacy demo IDs).
 */
export function resolveAuthSessionFromStorage() {
  const raw = readAuthSession();
  if (!raw?.userId) return null;

  const users = readAuthUsers();
  const exists = Array.isArray(users) && users.some((u) => u.userId === raw.userId);
  if (!exists) {
    persistAuthSession(null);
    return null;
  }

  const reconciled = reconcileAuthSession(raw);
  return reconciled;
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

export function readAuthUsers() {
  return readStorageItems(STORAGE_KEYS.AUTH_USERS);
}

export function writeAuthUsers(users) {
  writeStorageEnvelope(STORAGE_KEYS.AUTH_USERS, Array.isArray(users) ? users : []);
}

export function persistAuthSession(session) {
  if (session && session.userId) {
    writeStorageEnvelope(STORAGE_KEYS.AUTH_SESSION, [session]);
  } else {
    writeStorageEnvelope(STORAGE_KEYS.AUTH_SESSION, []);
  }
}

export function setUserStoreId(userId, storeId) {
  const users = readAuthUsers();
  const idx = users.findIndex((u) => u.userId === userId);
  if (idx < 0) return false;
  const updated = { ...users[idx], storeId };
  writeAuthUsers([...users.slice(0, idx), updated, ...users.slice(idx + 1)]);
  return true;
}

export function updateAuthProfile(userId, { name, email }) {
  const users = readAuthUsers();
  const idx = users.findIndex((u) => u.userId === userId);
  if (idx < 0) return { ok: false, error: "USER_NOT_FOUND" };

  const nextName = String(name || "").trim();
  const nextEmail = String(email || "").trim().toLowerCase();
  if (!nextName || !nextEmail) {
    return { ok: false, error: "INVALID" };
  }

  const taken = users.some((u, i) => i !== idx && String(u.email || "").toLowerCase() === nextEmail);
  if (taken) {
    return { ok: false, error: "EMAIL_TAKEN" };
  }

  const prev = users[idx];
  const updated = { ...prev, name: nextName, email: nextEmail };
  writeAuthUsers([...users.slice(0, idx), updated, ...users.slice(idx + 1)]);

  const store = findStoreByOwnerUserId(userId);
  if (store) {
    upsertStoreRecord({
      ...store,
      email: nextEmail,
      user: {
        ...store.user,
        id: userId,
        name: nextName,
        email: nextEmail,
      },
    });
  }

  return { ok: true, user: updated };
}

/**
 * Drops storeId from session when it does not match a store owned by this user
 * (fixes stale links such as the old shared demo store_1 id).
 */
export function reconcileAuthSession(session) {
  if (!session?.userId) return session;
  if (!session.storeId) return session;
  const store = findStoreById(session.storeId);
  if (store && store.userId === session.userId) return session;

  const cleared = { ...session, storeId: null };
  setUserStoreId(session.userId, null);
  persistAuthSession(cleared);
  return cleared;
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

  const session = state.auth?.session;
  const uid = session?.userId || "guest";
  persistAddressesForUser(uid, state.address?.list || []);

  persistAuthSession(session || null);

  const dummyIds = new Set(productDummyData.map((p) => p.id));
  const extras = (state.product?.list || []).filter((p) => p?.id && !dummyIds.has(p.id));
  writeStorageEnvelope(STORAGE_KEYS.PRODUCTS, extras);
}
