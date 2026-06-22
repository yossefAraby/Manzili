import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as wishlistApi from '@/lib/api/wishlist'

// --- Async thunks (API-backed, fail safe) ---------------------------------
//
// These hydrate / mutate the wishlist via the .NET API. The sync reducers below are kept so
// the heart toggle stays OPTIMISTIC: components dispatch the local action immediately for an
// instant UI response, then dispatch the matching thunk to persist server-side. If the user is
// logged out (no token) the API module returns empty/false and we silently keep local state.

/** Load the server wishlist and replace the local membership map. */
export const hydrateWishlist = createAsyncThunk('wishlist/hydrate', async () => {
    const ids = await wishlistApi.fetchWishlist() // [] when logged out / on error
    return ids
})

/** Persist an add; optimistic local add should already have run. */
export const persistAddToWishlist = createAsyncThunk(
    'wishlist/persistAdd',
    async (productId) => {
        await wishlistApi.addToWishlist(productId)
        return productId
    }
)

/** Persist a remove; optimistic local remove should already have run. */
export const persistRemoveFromWishlist = createAsyncThunk(
    'wishlist/persistRemove',
    async (productId) => {
        await wishlistApi.removeFromWishlist(productId)
        return productId
    }
)

/** Persist a clear; optimistic local clear should already have run. */
export const persistClearWishlist = createAsyncThunk('wishlist/persistClear', async () => {
    await wishlistApi.clearWishlist()
    return true
})

/**
 * Optimistic toggle that also persists to the server. The reducer flips local state, and this
 * thunk fires the matching API call based on the resulting membership. Fail safe for guests.
 */
export const toggleWishlistRemote = createAsyncThunk(
    'wishlist/toggleRemote',
    async (productId, { getState, dispatch }) => {
        dispatch(toggleWishlist({ productId }))
        const nowInWishlist = Boolean(getState().wishlist.wishlistItems[productId])
        if (nowInWishlist) await wishlistApi.addToWishlist(productId)
        else await wishlistApi.removeFromWishlist(productId)
        return productId
    }
)

function idsToMap(ids) {
    const map = {}
    for (const id of ids || []) map[String(id)] = true
    return map
}

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState: {
        total: 0,
        wishlistItems: {},
    },
    reducers: {
        addToWishlist: (state, action) => {
            const { productId } = action.payload
            if (!state.wishlistItems[productId]) {
                state.wishlistItems[productId] = true
                state.total += 1
            }
        },
        removeFromWishlist: (state, action) => {
            const { productId } = action.payload
            if (state.wishlistItems[productId]) {
                delete state.wishlistItems[productId]
                state.total -= 1
            }
        },
        toggleWishlist: (state, action) => {
            const { productId } = action.payload
            if (state.wishlistItems[productId]) {
                delete state.wishlistItems[productId]
                state.total -= 1
            } else {
                state.wishlistItems[productId] = true
                state.total += 1
            }
        },
        clearWishlist: (state) => {
            state.wishlistItems = {}
            state.total = 0
        },
    },
    extraReducers: (builder) => {
        builder.addCase(hydrateWishlist.fulfilled, (state, action) => {
            const map = idsToMap(action.payload)
            state.wishlistItems = map
            state.total = Object.keys(map).length
        })
        // persist* thunks intentionally do not mutate state — the optimistic local action did.
    },
})

export const { addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist } =
    wishlistSlice.actions

export default wishlistSlice.reducer
