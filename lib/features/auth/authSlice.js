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
    },
    reducers: {
        setSession: (state, action) => {
            state.session = action.payload;
        },
        clearSession: (state) => {
            state.session = null;
        },
    },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;

// ---- role selectors ---------------------------------------------------------

export const ROLE_GUEST = 'guest';
export const ROLE_BUYER = 'buyer';
export const ROLE_SELLER = 'seller';

export const selectSession = (state) => state.auth.session;

export const selectIsLoggedIn = (state) => Boolean(state.auth.session?.userId);

export const selectIsSeller = (state) =>
    Boolean(state.auth.session?.userId && state.auth.session?.storeId);

export const selectIsBuyer = (state) =>
    Boolean(state.auth.session?.userId && !state.auth.session?.storeId);

export const selectAccountRole = (state) => {
    const s = state.auth.session;
    if (!s?.userId) return ROLE_GUEST;
    return s.storeId ? ROLE_SELLER : ROLE_BUYER;
};
