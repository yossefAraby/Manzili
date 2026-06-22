'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import {
  bootstrapLocalStorage,
  persistReduxState,
} from '@/lib/services/localStateBootstrap'
import { setSession, clearSession, markBootstrapped } from '@/lib/features/auth/authSlice'
import { clearCart } from '@/lib/features/cart/cartSlice'
import { hydrateAddresses } from '@/lib/features/address/addressSlice'
import { fetchSession, reconcileSession } from '@/lib/api/auth'
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

    // Rehydrate the session from the auth cookie. fetchSession is fail-safe: it
    // returns null for guests (and never clears the cart). reconcile re-derives the
    // seller role in case a store was approved/disabled since the cookie was minted.
    ;(async () => {
      const session = await fetchSession()
      if (cancelled) return
      if (!session) { store.dispatch(markBootstrapped()); return }
      store.dispatch(setSession(session))
      // Load the saved address book platform-wide (not just on the profile page),
      // so an address added at checkout is still there everywhere after a reload.
      store.dispatch(hydrateAddresses())
      const next = await reconcileSession(session)
      if (!cancelled && next && next !== session) store.dispatch(setSession(next))
    })()

    const unsubscribe = store.subscribe(() => {
      const state = store.getState()
      persistReduxState(state)
      // Keep the non-React auth mirror in sync so plain API modules know whether to
      // fire authenticated requests (they can't read the httpOnly cookie or Redux).
      setAuthed(Boolean(state.auth?.session?.userId))
    })

    // When an authenticated call hits an unrecoverable 401 (cookie refresh failed),
    // the API client fires this event; drop the in-memory session + cart so the UI
    // reflects logged-out immediately.
    const onAuthExpired = () => { store.dispatch(clearSession()); store.dispatch(clearCart()) }
    window.addEventListener('manzili:auth-expired', onAuthExpired)

    return () => {
      cancelled = true
      unsubscribe()
      window.removeEventListener('manzili:auth-expired', onAuthExpired)
    }
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
