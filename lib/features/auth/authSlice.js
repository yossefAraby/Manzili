import { createSlice } from '@reduxjs/toolkit';

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
