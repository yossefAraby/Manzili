import { createSlice } from '@reduxjs/toolkit'

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
})

export const { addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist } =
    wishlistSlice.actions

export default wishlistSlice.reducer
