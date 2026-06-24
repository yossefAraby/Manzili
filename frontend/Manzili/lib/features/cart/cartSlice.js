import { createSlice } from '@reduxjs/toolkit'
import { getInitialCartState } from '@/lib/services/localStateBootstrap'

/**
 * Serialize a variants map into a stable string key segment.
 * { Color: "Red", Size: "M" } → "Color=Red|Size=M"
 */
export function serializeVariants(variants) {
    if (!variants || typeof variants !== 'object' || Object.keys(variants).length === 0) return '';
    return Object.entries(variants)
        .map(([type, val]) => `${encodeURIComponent(type)}=${encodeURIComponent(String(val))}`)
        .join('|');
}

/**
 * Build a composite cart key from productId + variant selection.
 * "prod_1" + {}           → "prod_1::"
 * "prod_1" + {Color:"Red"} → "prod_1::Color=Red"
 */
export function makeCartKey(productId, variants = {}) {
    const vp = serializeVariants(variants);
    return vp ? `${productId}::${vp}` : `${productId}::`;
}

const cartSlice = createSlice({
    name: 'cart',
    initialState: getInitialCartState(),
    reducers: {
        addToCart: (state, action) => {
            const { productId, variants = {} } = action.payload
            const key = makeCartKey(productId, variants)
            if (state.cartItems[key]) {
                state.cartItems[key].quantity += 1
            } else {
                state.cartItems[key] = {
                    productId,
                    quantity: 1,
                    variantKey: serializeVariants(variants),
                    variants,
                }
            }
            state.total += 1
        },
        removeFromCart: (state, action) => {
            const { key } = action.payload
            if (state.cartItems[key]) {
                state.cartItems[key].quantity -= 1
                if (state.cartItems[key].quantity === 0) {
                    delete state.cartItems[key]
                }
                state.total -= 1
            }
        },
        deleteItemFromCart: (state, action) => {
            const { key } = action.payload
            if (state.cartItems[key]) {
                state.total -= state.cartItems[key].quantity
                delete state.cartItems[key]
            }
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
        },
        // Replace the whole cart from an authoritative source (the account cart loaded
        // from the backend). Used on login/refresh so a logged-in cart follows the account.
        hydrateCart: (state, action) => {
            const { cartItems = {}, total = 0 } = action.payload || {}
            state.cartItems = cartItems
            state.total = total
        },
    },
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart, hydrateCart } = cartSlice.actions
export default cartSlice.reducer
