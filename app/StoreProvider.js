'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import {
  bootstrapLocalStorage,
  loadAddressesForUser,
  persistReduxState,
  resolveAuthSessionFromStorage,
} from '@/lib/services/localStateBootstrap'
import { setSession } from '@/lib/features/auth/authSlice'
import { setAddressList } from '@/lib/features/address/addressSlice'
import { rehydrateProductsFromStorage } from '@/lib/features/product/productSlice'
import { setNotifications } from '@/lib/features/notification/notificationSlice'
import { listNotificationsForUser } from '@/lib/services/localNotificationService'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    bootstrapLocalStorage()
    let preload
    if (typeof window !== 'undefined') {
      const session = resolveAuthSessionFromStorage()
      preload = {
        auth: { session },
        address: { list: loadAddressesForUser(session?.userId) },
        notification: { list: listNotificationsForUser(session?.userId) },
      }
    }
    storeRef.current = makeStore(preload)
  }

  useEffect(() => {
    const store = storeRef.current
    const session = resolveAuthSessionFromStorage()
    store.dispatch(setSession(session))
    store.dispatch(setAddressList(loadAddressesForUser(session?.userId || 'guest')))
    store.dispatch(setNotifications(listNotificationsForUser(session?.userId || 'guest')))
    store.dispatch(rehydrateProductsFromStorage())
    const unsubscribe = store.subscribe(() => persistReduxState(store.getState()))
    return unsubscribe
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}
