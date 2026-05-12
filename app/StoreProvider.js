'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { bootstrapLocalStorage, persistReduxState } from '@/lib/services/localStateBootstrap'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    bootstrapLocalStorage()
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
    storeRef.current.subscribe(() => {
      persistReduxState(storeRef.current.getState())
    })
  }

  return <Provider store={storeRef.current}>{children}</Provider>
}