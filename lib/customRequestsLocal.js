/**
 * Browser localStorage simulation for custom requests (full cycle: create → list → collaboration).
 */

import {
  STORAGE_KEYS,
  readStorageItems,
  writeStorageEnvelope,
} from "@/lib/storage/localStorageEnvelope";

export const CUSTOM_REQUESTS_STORAGE_KEY = STORAGE_KEYS.CUSTOM_REQUESTS;

export function getLocalCustomRequests() {
  return readStorageItems(CUSTOM_REQUESTS_STORAGE_KEY) || [];
}

export function setLocalCustomRequests(requests) {
  writeStorageEnvelope(CUSTOM_REQUESTS_STORAGE_KEY, requests);
}

/** Insert or replace by id (newest first). */
export function addLocalCustomRequest(request) {
  const list = getLocalCustomRequests().filter((r) => r.id !== request.id);
  setLocalCustomRequests([request, ...list]);
  return request;
}

export function getLocalCustomRequestById(id) {
  return getLocalCustomRequests().find((r) => r.id === id) ?? null;
}

/** Local entries override API entries with the same id. */
export function mergeCustomRequestLists(apiRequests = [], localRequests = []) {
  const map = new Map();
  (apiRequests || []).forEach((r) => {
    if (r?.id) map.set(r.id, r);
  });
  (localRequests || []).forEach((r) => {
    if (r?.id) map.set(r.id, r);
  });
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
}

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Shape used by /collaboration/[id] UI */
export function mapStoredRequestToCollaborationOrder(raw) {
  if (!raw) return null;

  const colorRows = Array.isArray(raw.colors)
    ? raw.colors
        .filter((c) => c && (c.hex || c.description))
        .map((c) => ({
          hex: c.hex || "#e5e7eb",
          name: (c.description || c.name || "").trim() || "Color",
        }))
    : [];

  const mainImage =
    Array.isArray(raw.images) && raw.images.length > 0
      ? raw.images[0]
      : "/placeholder.png";

  return {
    id: raw.id,
    itemName: raw.itemName || "Custom request",
    description: raw.description || "",
    category: raw.category || "",
    buyerName: raw.user?.name || "Buyer",
    material: raw.material?.trim() ? raw.material : "—",
    quantity: raw.quantity ?? 1,
    buyerDeadline: raw.deliveryDate || "",
    colors:
      colorRows.length > 0
        ? colorRows
        : [{ hex: "#e5e7eb", name: "Not specified" }],
    mainImage,
    voiceNoteUrl: raw.voiceMemoDataUrl || raw.voiceMemoUrl || null,
    visibility: raw.visibility,
    store: raw.store || null,
    size: raw.size || null,
  };
}
