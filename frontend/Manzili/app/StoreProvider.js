'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import {
  bootstrapLocalStorage,
  persistReduxState,
} from '@/lib/services/localStateBootstrap'
import { setSession, clearSession, markBootstrapped } from '@/lib/features/auth/authSlice'
import { clearCart, hydrateCart, markCartHydrated } from '@/lib/features/cart/cartSlice'
import { hydrateAddresses } from '@/lib/features/address/addressSlice'
import { fetchProducts } from '@/lib/features/product/productSlice'
import { fetchSession, reconcileSession } from '@/lib/api/auth'
import { fetchServerCart, saveServerCart } from '@/lib/api/cart'
import { setAuthed } from '@/lib/api/authState'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Only the cart is preloaded from local storage. The auth session is NOT stored
    // on the client at all — it's rehydrated from the httpOnly cookie via /auth/me
    // after mount (see below), so the server render and first client paint match.
    bootstrapLocalStorage()
    storeRef.current = makeStore()
  }

  useEffect(() => {
    const store = storeRef.current
    let cancelled = false

    // Load the catalog ONCE on app start so every page that reads state.product.list
    // (home Latest/Best-selling, cart, wishlist) has products immediately — no longer
    // empty until the shopper happens to open /shop first.
    if (store.getState().product.list.length === 0) {
      store.dispatch(fetchProducts())
    }

    // Rehydrate the session from the auth cookie. fetchSession is fail-safe: it
    // returns null for guests (and never clears the cart). reconcile re-derives the
    // seller role in case a store was approved/disabled since the cookie was minted.
    ;(async () => {
      const session = await fetchSession()
      if (cancelled) return
      // Guests have no account cart to load — mark the cart hydrated so the cart page
      // shows its empty state (not a perpetual loader).
      if (!session) { store.dispatch(markBootstrapped()); store.dispatch(markCartHydrated()); return }
      store.dispatch(setSession(session))
      // Load the saved address book platform-wide (not just on the profile page),
      // so an address added at checkout is still there everywhere after a reload.
      store.dispatch(hydrateAddresses())
      // Load the account cart (authoritative for a logged-in buyer) so it follows the
      // account across devices and survives logout — the cart is no longer browser-local.
      // Always mark hydrated when done (even on empty/error) so the page stops loading.
      fetchServerCart()
        .then((c) => { if (cancelled) return; if (c) store.dispatch(hydrateCart(c)); else store.dispatch(markCartHydrated()) })
        .catch(() => { if (!cancelled) store.dispatch(markCartHydrated()) })
      const next = await reconcileSession(session)
      if (!cancelled && next && next !== session) store.dispatch(setSession(next))
    })()

    let prevCart = store.getState().cart.cartItems
    let cartSaveTimer = null
    const unsubscribe = store.subscribe(() => {
      const state = store.getState()
      persistReduxState(state)
      // Keep the non-React auth mirror in sync so plain API modules know whether to
      // fire authenticated requests (they can't read the httpOnly cookie or Redux).
      setAuthed(Boolean(state.auth?.session?.userId))
      // Account-cart sync: when logged in and the cart changed, debounce a save to the
      // backend so the account cart stays current without a request per keystroke.
      const cartRef = state.cart.cartItems
      if (cartRef !== prevCart) {
        prevCart = cartRef
        if (state.auth?.session?.userId) {
          if (cartSaveTimer) clearTimeout(cartSaveTimer)
          cartSaveTimer = setTimeout(() => { saveServerCart(cartRef) }, 1000)
        }
      }
    })

    // When an authenticated call hits an unrecoverable 401 (cookie refresh failed),
    // the API client fires this event; drop the in-memory session + cart so the UI
    // reflects logged-out immediately.
    const onAuthExpired = () => { store.dispatch(clearSession()); store.dispatch(clearCart()) }
    window.addEventListener('manzili:auth-expired', onAuthExpired)

    return () => {
      cancelled = true
      if (cartSaveTimer) clearTimeout(cartSaveTimer)
      unsubscribe()
      window.removeEventListener('manzili:auth-expired', onAuthExpired)
    }
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
