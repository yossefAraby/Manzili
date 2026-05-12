import { assets } from "@/assets/assets";
import {
  STORAGE_KEYS,
  makeEntityId,
  readStorageItems,
  writeStorageEnvelope,
} from "@/lib/storage/localStorageEnvelope";

export function readStoresList() {
  return readStorageItems(STORAGE_KEYS.STORES);
}

export function upsertStoreRecord(store) {
  const list = readStoresList();
  const idx = list.findIndex((s) => s.id === store.id);
  const next =
    idx >= 0 ? [...list.slice(0, idx), store, ...list.slice(idx + 1)] : [...list, store];
  writeStorageEnvelope(STORAGE_KEYS.STORES, next);
}

export function findStoreById(id) {
  if (!id) return null;
  return readStoresList().find((s) => s.id === id) || null;
}

export function findStoreByOwnerUserId(userId) {
  if (!userId) return null;
  return readStoresList().find((s) => s.userId === userId) || null;
}

function logoSrc() {
  const l = assets.logo;
  return typeof l === "string" ? l : l?.src || "/favicon.ico";
}

/**
 * Each user may own at most one store (enforced here).
 */
export function createStoreForUser({ userId, ownerName, ownerEmail, storeName }) {
  const existing = findStoreByOwnerUserId(userId);
  if (existing) {
    return { ok: false, error: "STORE_EXISTS", store: existing };
  }
  const storeId = makeEntityId("store");
  const safeLocal = (ownerEmail || "shop").split("@")[0].replace(/[^a-z0-9_-]/gi, "").slice(0, 24);
  const usernameBase = safeLocal || "seller";
  const store = {
    id: storeId,
    userId,
    name: (storeName || `${ownerName}'s Shop`).trim(),
    description: "",
    username: `${usernameBase}_${storeId.slice(-6)}`,
    address: "",
    status: "approved",
    isActive: true,
    logo: logoSrc(),
    email: ownerEmail || "",
    contact: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: userId,
      name: ownerName,
      email: ownerEmail || "",
      image: logoSrc(),
    },
  };
  upsertStoreRecord(store);
  return { ok: true, store };
}
