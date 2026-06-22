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
        session: null,
        // false until the app has probed GET /auth/me once. Gates (admin/store) wait
        // for this before deciding "logged out", so a logged-in user isn't bounced to
        // login during the async cookie rehydrate.
        bootstrapped: false,
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
    },
});

export const { setSession, clearSession, markBootstrapped } = authSlice.actions;
export default authSlice.reducer;

// ---- role selectors ---------------------------------------------------------

export const ROLE_GUEST = 'guest';
export const ROLE_BUYER = 'buyer';
export const ROLE_SELLER = 'seller';
export const ROLE_ADMIN = 'admin';

export const selectSession = (state) => state.auth.session;

/** True once the initial cookie-session probe has completed (logged in or not). */
export const selectAuthBootstrapped = (state) => state.auth.bootstrapped;

export const selectIsLoggedIn = (state) => Boolean(state.auth.session?.userId);

export const selectIsAdmin = (state) => state.auth.session?.role === ROLE_ADMIN;

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
