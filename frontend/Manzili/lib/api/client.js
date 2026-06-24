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
let adminRefreshPromise = null;

// Admin endpoints (/admin/*) authenticate with a SEPARATE cookie and refresh via a separate
// endpoint, so a 401 on an admin call must refresh the admin cookie — not the storefront one —
// and must not drop the buyer/seller session.
function isAdminPath(path) {
  return typeof path === 'string' && path.startsWith('/admin');
}

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

async function tryRefresh(admin = false) {
  // The refresh cookie rides along automatically; a 200 means new cookies were set.
  // Admin and storefront refreshes hit different endpoints (and different cookies).
  if (admin) {
    if (!adminRefreshPromise) {
      adminRefreshPromise = (async () => {
        const res = await rawFetch('/admin/auth/refresh', { method: 'POST' });
        return res.ok;
      })().finally(() => { adminRefreshPromise = null; });
    }
    return adminRefreshPromise;
  }
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await rawFetch('/auth/refresh', { method: 'POST' });
      return res.ok;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

/**
 * Storefront cookie refresh, deduped via the shared singleton above. The bootstrap probe
 * (lib/api/auth.fetchSession) must use THIS — not its own /auth/refresh — so a cold post-payment
 * load doesn't fire two concurrent refreshes that race the single-use rotating token (the loser
 * 401s and fires manzili:auth-expired, stranding the navbar logged-out until a manual refresh).
 */
export function refreshSession() {
  return tryRefresh(false);
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
  const admin = isAdminPath(path);
  let res = await rawFetch(path, options);

  if (res.status === 401 && retry && auth) {
    const refreshed = await tryRefresh(admin);
    if (refreshed) res = await rawFetch(path, options);
  }

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }

  if (!res.ok || (json && json.success === false)) {
    const err = (json && json.error) || {};
    if (res.status === 401 && auth && typeof window !== 'undefined') {
      // Refresh absent or failed: tell the app to drop the in-memory session so the
      // UI reflects logged-out immediately (no stale "ghost login"). Admin and storefront
      // sessions are independent, so fire the matching event — an expired admin token must
      // NOT log the buyer/seller out, and vice versa.
      window.dispatchEvent(new Event(admin ? 'manzili:admin-expired' : 'manzili:auth-expired'));
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
