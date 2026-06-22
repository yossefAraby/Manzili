import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as addressesApi from '@/lib/api/addresses';

// --- Async thunks (API-backed, fail safe) ---------------------------------
//
// The existing sync reducers (`setAddressList`, `addAddress`) are preserved: StoreProvider
// preloads from local storage with `setAddressList`, the logout flow clears with it, and the
// optimistic create still pushes via `addAddress`. The thunks below hydrate / mutate via the
// .NET API and return empty/null for guests so nothing crashes when logged out.

/** Load the server address book and replace the local list. */
export const hydrateAddresses = createAsyncThunk('address/hydrate', async () => {
    const list = await addressesApi.fetchAddresses(); // [] when logged out / on error
    return list;
});

/** Create an address server-side, then return the created (UI-shape) record. */
export const createAddressRemote = createAsyncThunk(
    'address/create',
    async (payload) => {
        const created = await addressesApi.createAddress(payload);
        return created; // null when logged out / on error
    }
);

/** Delete an address server-side, then drop it locally. */
export const deleteAddressRemote = createAsyncThunk(
    'address/delete',
    async (id) => {
        await addressesApi.deleteAddress(id);
        return id;
    }
);

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [],
    },
    reducers: {
        setAddressList: (state, action) => {
            state.list = Array.isArray(action.payload) ? action.payload : [];
        },
        addAddress: (state, action) => {
            state.list.push(action.payload);
        },
        removeAddress: (state, action) => {
            state.list = state.list.filter((a) => a.id !== action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(hydrateAddresses.fulfilled, (state, action) => {
                if (Array.isArray(action.payload)) state.list = action.payload;
            })
            .addCase(createAddressRemote.fulfilled, (state, action) => {
                if (action.payload && action.payload.id) state.list.push(action.payload);
            })
            .addCase(deleteAddressRemote.fulfilled, (state, action) => {
                state.list = state.list.filter((a) => a.id !== action.payload);
            });
    },
});

export const { addAddress, setAddressList, removeAddress } = addressSlice.actions;
export default addressSlice.reducer;
