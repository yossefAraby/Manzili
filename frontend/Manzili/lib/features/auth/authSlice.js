import { createSlice } from '@reduxjs/toolkit';

/**
 * Single source of truth for "who is this account?".
 *
 *   - guest:  no session
 *   - buyer:  signed in, no store linked
 *   - seller: signed in AND owns a store (session.storeId is set and
 *             reconciled against the store registry on bootstrap)
 *
 * `storeId` is the only persisted role marker — adding a separate `role`
 * field would duplicate state and let the two drift. The selectors below
 * derive the role from `storeId` so every consumer agrees.
 */

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        // The buyer/seller session (storefront identity). Rehydrated from the normal
        // httpOnly cookie via GET /auth/me.
        session: null,
        // The ADMIN session — kept in a SEPARATE field so an admin login can never
        // overwrite a buyer/seller identity (and vice versa). It uses its own cookie
        // (path /api/v1/admin) and is rehydrated from GET /admin/auth/me inside the
        // admin layout only. Storefront selectors below read `session` exclusively.
        adminSession: null,
        // false until the app has probed GET /auth/me once. Gates (store) wait for this
        // before deciding "logged out", so a logged-in user isn't bounced during the
        // async cookie rehydrate.
        bootstrapped: false,
        // Same idea, but for the admin probe (only runs inside the admin area).
        adminBootstrapped: false,
    },
    reducers: {
        setSession: (state, action) => {
            state.session = action.payload;
            state.bootstrapped = true;
        },
        clearSession: (state) => {
            state.session = null;
            state.bootstrapped = true;
        },
        markBootstrapped: (state) => {
            state.bootstrapped = true;
        },
        setAdminSession: (state, action) => {
            state.adminSession = action.payload;
            state.adminBootstrapped = true;
        },
        clearAdminSession: (state) => {
            state.adminSession = null;
            state.adminBootstrapped = true;
        },
        markAdminBootstrapped: (state) => {
            state.adminBootstrapped = true;
        },
    },
});

export const {
    setSession, clearSession, markBootstrapped,
    setAdminSession, clearAdminSession, markAdminBootstrapped,
} = authSlice.actions;
export default authSlice.reducer;

// ---- role selectors ---------------------------------------------------------

export const ROLE_GUEST = 'guest';
export const ROLE_BUYER = 'buyer';
export const ROLE_SELLER = 'seller';
export const ROLE_ADMIN = 'admin';

export const selectSession = (state) => state.auth.session;

/** The admin-portal session (separate from the storefront session). */
export const selectAdminSession = (state) => state.auth.adminSession;

/** True once the initial cookie-session probe has completed (logged in or not). */
export const selectAuthBootstrapped = (state) => state.auth.bootstrapped;

/** True once the admin cookie probe has completed (only runs inside the admin area). */
export const selectAdminBootstrapped = (state) => state.auth.adminBootstrapped;

export const selectIsLoggedIn = (state) => Boolean(state.auth.session?.userId);

// Admin status comes from the SEPARATE admin session — never from the storefront session —
// so an admin login can't make a buyer/seller look like an admin (or get bounced for role).
export const selectIsAdmin = (state) => state.auth.adminSession?.role === ROLE_ADMIN;

export const selectIsSeller = (state) =>
    Boolean(state.auth.session?.userId && state.auth.session?.storeId) &&
    state.auth.session?.role !== ROLE_ADMIN;

export const selectIsBuyer = (state) =>
    Boolean(state.auth.session?.userId && !state.auth.session?.storeId) &&
    state.auth.session?.role !== ROLE_ADMIN;

export const selectAccountRole = (state) => {
    const s = state.auth.session;
    if (!s?.userId) return ROLE_GUEST;
    if (s.role === ROLE_ADMIN) return ROLE_ADMIN;
    return s.storeId ? ROLE_SELLER : ROLE_BUYER;
};
