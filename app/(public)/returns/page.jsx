'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { RotateCcwIcon, CheckCircleIcon, ClockIcon, PackageIcon, ArrowRightIcon } from 'lucide-react'
import { getCurrencySymbol } from '@/lib/currency'
import PageTitle from '@/components/PageTitle'

// ─── helpers ──────────────────────────────────────────────────────────────────
const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function daysLeft(createdAt) {
    const elapsed = Date.now() - new Date(createdAt).getTime()
    return Math.max(0, Math.ceil((RETURN_WINDOW_MS - elapsed) / (24 * 60 * 60 * 1000)))
}

function isEligible(storeOrder) {
    return (
        storeOrder.status === 'DELIVERED' &&
        storeOrder.paymentMethod === 'STRIPE' &&
        Date.now() - new Date(storeOrder.createdAt).getTime() < RETURN_WINDOW_MS
    )
}

function getFirstImage(storeOrder) {
    const img = storeOrder.orderItems?.[0]
    if (!img) return '/favicon.ico'
    return (
        img.product?.images?.[0]?.src ||
        img.product?.images?.[0] ||
        img.image ||
        '/favicon.ico'
    )
}

// ─── Return card ──────────────────────────────────────────────────────────────
function ReturnCard({ storeOrder, onReturnSuccess }) {
    const currency = getCurrencySymbol()
    const eligible = isEligible(storeOrder)
    const returned = storeOrder.status === 'RETURNED'
    const remaining = daysLeft(storeOrder.createdAt)
    const [state, setState] = useState('idle') // idle | confirming | loading | done | error
    const [errMsg, setErrMsg] = useState('')

    const handleReturn = async () => {
        setState('loading')
        try {
            const res = await fetch('/api/store/orders/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeOrderId: storeOrder.id,
                    reason: 'Customer requested return',
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || 'Return failed')
            setState('done')
            onReturnSuccess?.(storeOrder.id)
        } catch (err) {
            setErrMsg(err?.message || 'Something went wrong. Please try again.')
            setState('error')
        }
    }

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Order</span>
                    <span className="font-mono text-slate-700 text-xs">{storeOrder.id.slice(-10).toUpperCase()}</span>
                </div>
                {returned || state === 'done' ? (
                    <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                        <RotateCcwIcon size={12} /> Returned
                    </span>
                ) : eligible ? (
                    <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                        <ClockIcon size={12} /> {remaining} day{remaining !== 1 ? 's' : ''} left to return
                    </span>
                ) : (
                    <span className="text-xs text-slate-400">Return window closed</span>
                )}
            </div>

            {/* Card body */}
            <div className="px-5 py-4 flex gap-4 items-start">
                {/* Thumbnail */}
                <div className="w-16 h-16 shrink-0 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <Image
                        src={getFirstImage(storeOrder)}
                        alt="product"
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                    />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">
                        {storeOrder.orderItems?.map(i => i.product?.name || i.name).join(', ')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {storeOrder.orderItems?.length} item{storeOrder.orderItems?.length !== 1 ? 's' : ''}
                        {' · '}
                        {storeOrder.store?.name || 'Store'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Ordered {new Date(storeOrder.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                        })}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">
                        {currency}{Number(storeOrder.total).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Return action */}
            {!returned && state !== 'done' && (
                <div className="px-5 pb-4">
                    {eligible ? (
                        <>
                            {state === 'idle' && (
                                <button
                                    onClick={() => setState('confirming')}
                                    className="text-sm border border-slate-300 text-slate-700 px-5 py-2 rounded-lg hover:bg-slate-50 transition active:scale-95"
                                >
                                    Request Return
                                </button>
                            )}
                            {state === 'confirming' && (
                                <div className="flex items-center gap-3 flex-wrap">
                                    <p className="text-sm text-slate-600">Confirm return of this order?</p>
                                    <button
                                        onClick={handleReturn}
                                        className="text-sm bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-900 transition active:scale-95"
                                    >
                                        Yes, return it
                                    </button>
                                    <button
                                        onClick={() => setState('idle')}
                                        className="text-sm border border-slate-200 text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            {state === 'loading' && (
                                <p className="text-sm text-slate-400">Processing return…</p>
                            )}
                            {state === 'error' && (
                                <p className="text-sm text-rose-500">{errMsg}</p>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-slate-400">
                            This order is no longer eligible for return.
                            {storeOrder.paymentMethod !== 'STRIPE' && ' COD orders cannot be returned online.'}
                        </p>
                    )}
                </div>
            )}

            {/* Done state */}
            {state === 'done' && (
                <div className="px-5 pb-4 flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircleIcon size={16} />
                    Return submitted. Your refund will be processed within 5–7 business days.
                </div>
            )}
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ReturnsPage() {
    const currency = getCurrencySymbol()
    const [storeOrders, setStoreOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [returnedIds, setReturnedIds] = useState(new Set())

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/orders')
                const data = await res.json()
                if (cancelled) return

                // Flatten all storeOrders from all orders
                const all = (data?.orders ?? []).flatMap((order) =>
                    (order.storeOrders ?? []).map((so) => ({
                        ...so,
                        store: so.store,
                    })),
                )

                // Only show DELIVERED and RETURNED store orders
                const relevant = all.filter(
                    (so) => so.status === 'DELIVERED' || so.status === 'RETURNED',
                )

                setStoreOrders(relevant)
            } catch {
                setStoreOrders([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [])

    const handleReturnSuccess = (id) => {
        setReturnedIds((prev) => new Set([...prev, id]))
    }

    // Separate eligible (DELIVERED + within window) from already returned
    const eligible = storeOrders.filter(
        (so) => so.status === 'DELIVERED' && isEligible(so),
    )
    const pastWindow = storeOrders.filter(
        (so) => so.status === 'DELIVERED' && !isEligible(so),
    )
    const returned = storeOrders.filter(
        (so) => so.status === 'RETURNED' || returnedIds.has(so.id),
    )

    if (loading) {
        return (
            <div className="min-h-[70vh] mx-6 flex items-center justify-center">
                <p className="text-slate-400 text-sm">Loading your orders…</p>
            </div>
        )
    }

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="my-14 max-w-2xl mx-auto">
                <PageTitle
                    heading="Returns"
                    text="Manage returns for your delivered orders"
                    linkText="My orders"
                    path="/orders"
                />

                {/* Policy box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-sm text-slate-600 space-y-1.5">
                    <p className="font-medium text-slate-800 mb-2">Return Policy</p>
                    <p>• Items can be returned within <strong>7 days</strong> of order placement</p>
                    <p>• Refunds are issued to your original payment method within 5–7 business days</p>
                    <p>• Only card (Stripe) payments are eligible for online returns</p>
                    <p>• COD orders must be resolved by contacting support</p>
                    <p>• Items must be unused and in original condition</p>
                </div>

                {/* Eligible for return */}
                {eligible.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                            <PackageIcon size={18} className="text-amber-500" />
                            Eligible for Return
                        </h2>
                        <div className="flex flex-col gap-4">
                            {eligible.map((so) => (
                                <ReturnCard
                                    key={so.id}
                                    storeOrder={so}
                                    onReturnSuccess={handleReturnSuccess}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Already returned */}
                {returned.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                            <RotateCcwIcon size={18} className="text-slate-500" />
                            Returned Orders
                        </h2>
                        <div className="flex flex-col gap-4">
                            {returned.map((so) => (
                                <ReturnCard
                                    key={so.id}
                                    storeOrder={{ ...so, status: 'RETURNED' }}
                                    onReturnSuccess={handleReturnSuccess}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Past return window */}
                {pastWindow.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                            <ClockIcon size={18} className="text-slate-400" />
                            Past Return Window
                        </h2>
                        <div className="flex flex-col gap-4">
                            {pastWindow.map((so) => (
                                <ReturnCard
                                    key={so.id}
                                    storeOrder={so}
                                    onReturnSuccess={handleReturnSuccess}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Totally empty */}
                {eligible.length === 0 && returned.length === 0 && pastWindow.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <RotateCcwIcon size={40} className="text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium">No delivered orders found</p>
                        <p className="text-slate-400 text-sm mt-1 mb-6">
                            Only delivered orders are shown here.
                        </p>
                        <Link
                            href="/orders"
                            className="flex items-center gap-1.5 text-sm text-[#2582eb] hover:underline"
                        >
                            View all my orders <ArrowRightIcon size={14} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
