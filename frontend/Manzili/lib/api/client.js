// HTTP client for the Manzili .NET backend.
//
// Auth is COOKIE-based (httpOnly): the backend sets the access + refresh tokens as
// httpOnly cookies, and the browser sends them automatically when we fetch with
// `credentials: 'include'`. JavaScript never sees or stores a token — there is no
// localStorage/sessionStorage involved in auth at all.
//
// - Prepends NEXT_PUBLIC_API_BASE_URL (defaults to the local dev backend).
// - Unwraps the `{ success, data, ...meta }` envelope; throws a typed ApiError
//   on `{ success:false }` or a non-2xx status.
// - On 401, transparently calls /auth/refresh once (the refresh cookie is sent
//   automatically), then retries the original request.

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5080/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let refreshPromise = null;

async function rawFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  let payload = body;

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && body !== null && !isForm) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // `credentials: 'include'` makes the browser send (and accept) the httpOnly
  // auth cookies on this cross-origin request.
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
    credentials: 'include',
  });
}

async function tryRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      // The refresh cookie rides along automatically; a 200 means new cookies were set.
      const res = await rawFetch('/auth/refresh', { method: 'POST' });
      return res.ok;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

/**
 * Core request. Returns the full envelope object `{ success, data, ...meta }`.
 * Throws ApiError on failure.
 *
 * options.auth (default true): when true, a 401 triggers a one-shot cookie
 * refresh + retry, and an unrecoverable 401 fires `manzili:auth-expired` so the
 * app drops its in-memory session. Set auth:false for login/register/refresh and
 * for the bootstrap probe (so a guest's 401 doesn't churn session/cart).
 */
export async function apiFetch(path, options = {}) {
  const { retry = true, auth = true } = options;
  let res = await rawFetch(path, options);

  if (res.status === 401 && retry && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await rawFetch(path, options);
  }

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok || (json && json.success === false)) {
    const err = (json && json.error) || {};
    if (res.status === 401 && auth && typeof window !== 'undefined') {
      // Refresh absent or failed: tell the app to drop the in-memory session so the
      // UI reflects logged-out immediately (no stale "ghost login").
      window.dispatchEvent(new Event('manzili:auth-expired'));
    }
    throw new ApiError(err.message || `Request failed (${res.status})`, {
      code: err.code || `HTTP_${res.status}`,
      status: res.status,
      details: err.details,
    });
  }
  return json ?? { success: true, data: null };
}

// Convenience helpers — all return the envelope; read `.data` (and any meta).
export const apiGet = (path, options) => apiFetch(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options) => apiFetch(path, { ...options, method: 'POST', body });
export const apiPut = (path, body, options) => apiFetch(path, { ...options, method: 'PUT', body });
export const apiPatch = (path, body, options) => apiFetch(path, { ...options, method: 'PATCH', body });
export const apiDelete = (path, options) => apiFetch(path, { ...options, method: 'DELETE' });

export { BASE_URL };
