import {
  STORAGE_KEYS,
  makeEntityId,
  readStorageItems,
  writeStorageEnvelope,
} from "@/lib/storage/localStorageEnvelope";

function toDateValue(value) {
  return new Date(value || 0).getTime();
}

export function listNotificationsForUser(userId) {
  const uid = userId || "guest";
  const list = readStorageItems(STORAGE_KEYS.NOTIFICATIONS) || [];
  return list
    .filter((n) => (n.userId || "guest") === uid)
    .sort((a, b) => toDateValue(b.createdAt) - toDateValue(a.createdAt));
}

export function pushNotification({ userId, title, message, type, href }) {
  const uid = userId || "guest";
  const all = readStorageItems(STORAGE_KEYS.NOTIFICATIONS) || [];
  const payload = {
    id: makeEntityId("ntf"),
    userId: uid,
    title: title || "",
    message: message || "",
    type: type || "info",
    href: href || null,
    read: false,
    createdAt: new Date().toISOString(),
  };
  writeStorageEnvelope(STORAGE_KEYS.NOTIFICATIONS, [payload, ...all]);
  return payload;
}

export function persistNotifications(userId, list) {
  const uid = userId || "guest";
  const all = readStorageItems(STORAGE_KEYS.NOTIFICATIONS) || [];
  const others = all.filter((n) => (n.userId || "guest") !== uid);
  const tagged = (list || []).map((n) => ({ ...n, userId: uid }));
  writeStorageEnvelope(STORAGE_KEYS.NOTIFICATIONS, [...others, ...tagged]);
}
