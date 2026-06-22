// Current-user (profile) API calls + adapters for the .NET backend.
//
// The backend exposes:
//   GET   /users/me   -> { data: userDto }
//   PATCH /users/me   -> { data: userDto }
//
// The profile page edits name (+ optional avatar image). We adapt the DTO onto a small,
// predictable shape: { userId, name, email, image, storeId }. The first three line up with
// the app's session shape so the page can patch the Redux session after a save.
// All calls are auth-only and fail safe (null for guests / on error).

import { apiGet, apiPatch } from './client';
import { isAuthed } from './authState';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

/** Map a backend user DTO onto the UI profile shape. */
export function adaptUser(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const id = pick(dto, 'id', 'userId', 'personid');
  return {
    userId: id != null ? String(id) : null,
    name: pick(dto, 'name', 'fullName') || '',
    email: pick(dto, 'email') || '',
    image: pick(dto, 'image', 'avatar', 'imageUrl', 'profileImage') || null,
    storeId: dto.storeId != null ? String(dto.storeId) : null,
  };
}

/** Fetch the current user's profile (UI shape). Returns null for guests / on error. */
export async function fetchMe() {
  if (!isAuthed()) return null;
  try {
    const res = await apiGet('/users/me');
    return adaptUser(res?.data);
  } catch {
    return null;
  }
}

/**
 * Update the current user's profile. Accepts { name, image }.
 * Returns the updated profile (UI shape) on success, or null on failure.
 * Throws ApiError-free: callers should branch on null.
 */
export async function updateProfile({ name, image } = {}) {
  if (!isAuthed()) return null;
  const body = {};
  if (name !== undefined) body.name = name;
  if (image !== undefined) body.image = image;
  try {
    const res = await apiPatch('/users/me', body);
    // If the API echoes the updated user, adapt it; otherwise reflect the submitted fields.
    return adaptUser(res?.data) || adaptUser({ name, image });
  } catch {
    return null;
  }
}
