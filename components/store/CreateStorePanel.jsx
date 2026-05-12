'use client'

import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSession } from '@/lib/features/auth/authSlice'
import {
    persistAuthSession,
    reconcileAuthSession,
    setUserStoreId,
} from '@/lib/services/localStateBootstrap'
import { createStoreForUser } from '@/lib/services/localStoreRegistry'

export default function CreateStorePanel({ onCreated }) {
    const dispatch = useDispatch()
    const session = useSelector((s) => s.auth.session)
    const [storeName, setStoreName] = useState('')
    const [error, setError] = useState('')

    const onSubmit = (e) => {
        e.preventDefault()
        setError('')
        if (!session?.userId) return
        const name = storeName.trim() || `${session.name || 'My'}'s Shop`
        const created = createStoreForUser({
            userId: session.userId,
            ownerName: session.name || 'Seller',
            ownerEmail: session.email || '',
            storeName: name,
        })
        if (!created.ok) {
            setError('You already have a store for this account.')
            return
        }
        setUserStoreId(session.userId, created.store.id)
        const next = reconcileAuthSession({
            ...session,
            storeId: created.store.id,
        })
        persistAuthSession(next)
        dispatch(setSession(next))
        setStoreName('')
        onCreated?.(created.store)
    }

    return (
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-left">
            <h2 className="text-xl font-semibold text-slate-800">Open your store</h2>
            <p className="mt-2 text-sm text-slate-600">
                Each account can have one store. Choose a display name for your shop.
            </p>
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
                <label className="text-sm text-slate-700">
                    Store name
                    <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder={`${session?.name || 'My'}'s Shop`}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb]"
                    />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                    type="submit"
                    className="rounded-full bg-[#1c355e] py-3 text-white font-medium hover:bg-[#2582eb] transition-colors"
                >
                    Create store
                </button>
            </form>
        </div>
    )
}
