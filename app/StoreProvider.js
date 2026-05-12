'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import {
  bootstrapLocalStorage,
  loadAddressesForUser,
  persistReduxState,
  readAuthSession,
  reconcileAuthSession,
} from '@/lib/services/localStateBootstrap'
import { setSession } from '@/lib/features/auth/authSlice'
import { setAddressList } from '@/lib/features/address/addressSlice'
import { rehydrateProductsFromStorage } from '@/lib/features/product/productSlice'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    bootstrapLocalStorage()
    storeRef.current = makeStore()
  }

  useEffect(() => {
    const store = storeRef.current
    const session = reconcileAuthSession(readAuthSession())
    store.dispatch(setSession(session))
    const uid = session?.userId || 'guest'
    store.dispatch(setAddressList(loadAddressesForUser(uid)))
    store.dispatch(rehydrateProductsFromStorage())
    const unsubscribe = store.subscribe(() => persistReduxState(store.getState()))
    return unsubscribe
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
