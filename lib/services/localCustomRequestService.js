import {
  STORAGE_KEYS,
  makeEntityId,
  readStorageItems,
  writeStorageEnvelope,
} from "@/lib/storage/localStorageEnvelope";

function toDateValue(value) {
  return new Date(value || 0).getTime();
}

export async function listCustomRequests() {
  const list = readStorageItems(STORAGE_KEYS.CUSTOM_REQUESTS) || [];
  return [...list].sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt));
}

export async function getCustomRequestById(id) {
  const list = await listCustomRequests();
  return list.find((item) => item.id === id) ?? null;
}

export async function saveCustomRequest(request) {
  const list = readStorageItems(STORAGE_KEYS.CUSTOM_REQUESTS) || [];
  const now = new Date().toISOString();
  const id = request.id || makeEntityId("cr");
  const payload = {
    ...request,
    id,
    createdAt: request.createdAt || now,
    updatedAt: now,
  };

  const next = [payload, ...list.filter((item) => item.id !== id)];
  writeStorageEnvelope(STORAGE_KEYS.CUSTOM_REQUESTS, next);
  return payload;
}

export async function listOffersByRequestId(requestId) {
  const list = readStorageItems(STORAGE_KEYS.CUSTOM_REQUEST_OFFERS) || [];
  return list.filter((item) => item.requestId === requestId);
}

export async function addOfferToRequest(requestId, offer) {
  const offers = readStorageItems(STORAGE_KEYS.CUSTOM_REQUEST_OFFERS) || [];
  const now = new Date().toISOString();
  const payload = {
    id: makeEntityId("cro"),
    requestId,
    createdAt: now,
    updatedAt: now,
    ...offer,
  };
  writeStorageEnvelope(STORAGE_KEYS.CUSTOM_REQUEST_OFFERS, [payload, ...offers]);
  return payload;
}
