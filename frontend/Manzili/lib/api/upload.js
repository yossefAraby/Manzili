// Image upload helper for the .NET backend.
//
// uploadImage(file) POSTs `multipart/form-data` to `/upload` with the file under
// the field name `image`. The client passes the FormData straight through, so the
// browser sets the multipart boundary itself. The backend responds with the stored
// URL in one of the common shapes (`{ data: { url } }`, `{ url }`, or a bare string);
// we normalize all of them to a plain URL string.
//
// Throws ApiError on failure so callers can surface it (e.g. a toast).

import { apiPost } from './client';

/**
 * Upload a single image file and return its hosted URL.
 * @param {File|Blob} file
 * @returns {Promise<string|null>} the hosted URL, or null when no file is given.
 */
export async function uploadImage(file) {
  if (!file) return null;
  const form = new FormData();
  form.append('image', file);
  const res = await apiPost('/upload', form);
  const data = res?.data ?? res;
  if (typeof data === 'string') return data;
  return data?.url || data?.imageUrl || data?.src || data?.path || null;
}

export default uploadImage;
