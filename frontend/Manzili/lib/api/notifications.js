// Notification API calls + adapters for the .NET backend.
//
// The backend exposes:
//   GET   /notifications              -> { data: [ notificationDto ] }
//   PATCH /notifications/{id}/read    -> { data: { message } | notificationDto }
//
// The UI notification shape (consumed by NotificationBell) is:
//   { id, userId, title, message, type, href, read, createdAt }
// The API uses `isRead`; adaptNotification() maps `isRead` -> `read`. Defaults keep the bell
// from crashing on missing fields. All calls are auth-only and fail safe.

import { apiGet, apiPatch } from './client';
import { isAuthed } from './authState';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

/** Map a backend notification DTO onto the UI notification shape (isRead -> read). */
export function adaptNotification(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const id = pick(dto, 'id', 'notificationId', 'notificationid');
  const read = dto.read != null ? dto.read : (dto.isRead != null ? dto.isRead : false);
  return {
    id: id != null ? String(id) : null,
    userId: dto.userId != null ? String(dto.userId) : 'guest',
    title: pick(dto, 'title') || '',
    message: pick(dto, 'message', 'body', 'text') || '',
    type: pick(dto, 'type') || 'info',
    href: pick(dto, 'href', 'link', 'url') || null,
    read: Boolean(read),
    createdAt: pick(dto, 'createdAt', 'created_at', 'createdOn') || new Date().toISOString(),
  };
}

/**
 * Fetch the current user's notifications (UI shape, newest first). Returns [] for guests/on error.
 */
export async function fetchNotifications() {
  if (!isAuthed()) return [];
  try {
    const res = await apiGet('/notifications');
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows
      .map(adaptNotification)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

/** Mark a notification read on the server. Returns true on success, false otherwise. */
export async function markRead(id) {
  if (!isAuthed() || !id) return false;
  try {
    await apiPatch(`/notifications/${encodeURIComponent(id)}/read`);
    return true;
  } catch {
    return false;
  }
}
