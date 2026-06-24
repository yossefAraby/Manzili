// Auth API calls + session mapping for the .NET backend.
//
// Auth is COOKIE-based: the backend sets httpOnly access/refresh cookies on
// login/register; we never see or store a token. The session (who is this user)
// lives only in Redux memory and is rehydrated from GET /auth/me on each load.
//
// The backend returns:
//   register   -> { data: { id, name, email } }            (+ Set-Cookie)
//   login      -> { data: { user: {...} } }                 (+ Set-Cookie)
//   admin login-> { data: { user: { role:"admin" } } }      (+ Set-Cookie)
//   me         -> { data: { user: {...} } }
// We map the user onto the app's session shape { userId, name, email, storeId, role }.

import { apiGet, apiPost, refreshSession } from './client';

/** Map a backend user object to the app's session shape. */
function toSession(user) {
  const storeId = user.storeId ? String(user.storeId) : null;
  return {
    userId: String(user.id),
    name: user.name || '',
    email: user.email || '',
    image: user.image || null,
    storeId,
    role: user.role || (storeId ? 'seller' : 'buyer'),
  };
}

export async function apiRegister({ name, email, password }) {
  // auth:false — a failed register is a real error, not a token-expiry to refresh.
  const res = await apiPost('/auth/register', { name, email, password }, { auth: false });
  // register returns the plain user fields under data; role is always buyer.
  return toSession({ ...res.data, storeId: null });
}

export async function apiLogin({ email, password }) {
  const res = await apiPost('/auth/login', { email, password }, { auth: false });
  return toSession(res.data.user);
}

/**
 * Google Sign-In. `credential` is the GIS ID token (a JWT) the Google button hands back.
 * The backend verifies it and sets the SAME httpOnly cookie session as a password login,
 * so the returned session shape is identical to apiLogin's.
 */
export async function apiGoogleLogin(credential) {
  const res = await apiPost('/auth/google', { credential }, { auth: false });
  return toSession(res.data.user);
}

/**
 * Separate admin login (distinct portal). POSTs to /admin/auth/login and only
 * succeeds for accounts backed by a systemadmin row; the returned session has
 * role === 'admin'. Throws ApiError (401/403) for non-admins / bad credentials.
 */
export async function apiAdminLogin({ username, password }) {
  const res = await apiPost('/admin/auth/login', { username, password }, { auth: false });
  return toSession(res.data.user);
}

/**
 * Rehydrate the current session from the auth cookie. Returns the session shape
 * or null when not logged in. Done with auth:false + an explicit one-shot cookie
 * refresh so a guest's 401 never churns the app's session/cart on load.
 */
export async function fetchSession() {
  try {
    const r = await apiGet('/auth/me', { auth: false });
    return toSession(r.data.user);
  } catch (e) {
    if (e?.status !== 401) return null;
    // Access cookie may have expired — refresh once (via the shared singleton, so we don't race a
    // second concurrent /auth/refresh and rotate the single-use token out from under it), then re-probe.
    try {
      const ok = await refreshSession();
      if (!ok) return null;
      const r2 = await apiGet('/auth/me', { auth: false });
      return toSession(r2.data.user);
    } catch {
      return null;
    }
  }
}

/**
 * Re-derive the seller role/storeId for an already-logged-in session from the
 * backend. Store approval/disable happens server-side while the user may be
 * logged in as a buyer — their stale session would otherwise never gain (or
 * lose) storeId until a manual re-login. Fail-safe: returns the ORIGINAL session
 * object unchanged on any error or when nothing changed.
 */
export async function reconcileSession(session) {
  if (!session?.userId) return session;
  try {
    const r = await apiGet('/stores/my-application');
    const d = r?.data || {};
    const isSeller = d.status === 'approved' && !!d.isActive && d.storeId != null;
    const storeId = isSeller ? String(d.storeId) : null;
    const role = isSeller ? 'seller' : (session.role === 'admin' ? 'admin' : 'buyer');
    if (storeId === (session.storeId ?? null) && role === session.role) return session;
    return { ...session, storeId, role };
  } catch {
    return session;
  }
}

/** Clears the auth cookies server-side (best-effort; never throws). */
export async function apiLogout() {
  try { await apiPost('/auth/logout', null, { auth: false }); } catch { /* ignore */ }
}

/**
 * Rehydrate the ADMIN session from the admin cookie (separate from the storefront cookie).
 * Hits /admin/auth/me; on a 401 it tries a one-shot admin refresh, then re-probes. Returns the
 * session shape (role === 'admin') or null. Used by AdminLayout to restore the admin on reload
 * without touching the buyer/seller session.
 */
export async function fetchAdminSession() {
  try {
    const r = await apiGet('/admin/auth/me', { auth: false });
    return toSession(r.data.user);
  } catch (e) {
    if (e?.status !== 401) return null;
    try {
      await apiPost('/admin/auth/refresh', null, { auth: false });
      const r2 = await apiGet('/admin/auth/me', { auth: false });
      return toSession(r2.data.user);
    } catch {
      return null;
    }
  }
}

/** Clears the ADMIN cookies server-side (best-effort; never throws). */
export async function apiAdminLogout() {
  try { await apiPost('/admin/auth/logout', null, { auth: false }); } catch { /* ignore */ }
}
