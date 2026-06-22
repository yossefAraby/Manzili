'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { CircleDollarSignIcon, RotateCcwIcon } from 'lucide-react'
import Loading from '@/components/Loading'
import TrackingTimeline from '@/components/TrackingTimeline'
import { getCurrencySymbol } from '@/lib/currency'
import { fetchReturns } from '@/lib/api/seller'

function formatDate(dateStr) {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    const year = d.getFullYear()
    return `${day} ${month} ${year}`
}

export default function StoreReturns() {
    const storeId = useSelector((s) => s.auth.session?.storeId)
    const currency = getCurrencySymbol()

    const [returns, setReturns] = useState([])
    const [totalRefunded, setTotalRefunded] = useState(0)
    const [loading, setLoading] = useState(true)
    const [selectedReturn, setSelectedReturn] = useState(null)

    const fetchReturns = useCallback(async () => {
        if (!storeId) {
            setReturns([])
            setLoading(false)
            return
        }
        setLoading(true)
        // The .NET seller returns endpoint is the only source. On error we render
        // the "No returns yet" empty state cleanly (no local fallback).
        try {
            const { returns: list, totalRefunded: refunded } = await fetchReturns()
            setReturns(list)
            setTotalRefunded(refunded)
        } catch {
            setReturns([])
            setTotalRefunded(0)
        } finally {
            setLoading(false)
        }
    }, [storeId])

    useEffect(() => {
        fetchReturns()
    }, [fetchReturns])

    const openModal = (r) => setSelectedReturn(r)
    const closeModal = () => setSelectedReturn(null)

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">
                Store <span className="text-slate-800 font-medium">Returns</span>
            </h1>

            {/* Stat Cards */}
            <div className="flex flex-wrap gap-5 my-6">
                <div className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
                    <div className="flex flex-col gap-3 text-xs">
                        <p>Total Returns</p>
                        <b className="text-2xl font-medium text-slate-700">{returns.length}</b>
                    </div>
                    <RotateCcwIcon size={50} className="w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                </div>

                <div className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
                    <div className="flex flex-col gap-3 text-xs">
                        <p>Total Refunded</p>
                        <b className="text-2xl font-medium text-slate-700">
                            {currency} {totalRefunded.toFixed(2)}
                        </b>
                    </div>
                    <CircleDollarSignIcon size={50} className="w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                </div>
            </div>

            {/* Note */}
            <p className="text-sm text-slate-500 mb-6">
                Return requests are reviewed by an admin before they take effect. Once a return is approved,
                your wallet is debited automatically and the item is collected — no action needed from you. Only
                approved returns appear below.
            </p>

            {/* Table */}
            {returns.length === 0 ? (
                <p className="text-slate-600 mt-4">No returns yet.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Sr.', 'Customer', 'Items', 'Amount', 'Payment', 'Date Returned', 'Details'].map((h) => (
                                    <th key={h} className="py-3 px-4 text-left font-semibold text-slate-600">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {returns.map((r, index) => {
                                const itemCount = r.orderItems?.length ?? 0
                                return (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-4 text-[#2582eb]">{index + 1}</td>
                                        <td className="py-3 px-4 text-slate-800">
                                            {r.order?.address?.name || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-slate-800">
                                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-800">
                                            {currency} {Number(r.total).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="bg-[#2582eb]/10 text-[#2582eb] text-xs px-2 py-1 rounded-full">
                                                {r.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-800">
                                            {formatDate(r.updatedAt)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => openModal(r)}
                                                className="text-[#2582eb] hover:underline text-xs cursor-pointer"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Details Modal */}
            {selectedReturn && (
                <div
                    onClick={closeModal}
                    className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative"
                    >
                        <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">
                            Return Details
                        </h2>

                        {/* Customer */}
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Customer</h3>
                            <p>
                                <span className="text-[#2582eb]">Name:</span>{' '}
                                {selectedReturn.order?.address?.name || '—'}
                            </p>
                            <p>
                                <span className="text-[#2582eb]">Phone:</span>{' '}
                                {selectedReturn.order?.address?.phone || '—'}
                            </p>
                            <p>
                                <span className="text-[#2582eb]">Address:</span>{' '}
                                {[
                                    selectedReturn.order?.address?.street,
                                    selectedReturn.order?.address?.city,
                                    selectedReturn.order?.address?.state,
                                    selectedReturn.order?.address?.zip,
                                    selectedReturn.order?.address?.country,
                                ]
                                    .filter(Boolean)
                                    .join(', ') || '—'}
                            </p>
                        </div>

                        {/* Products */}
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Products</h3>
                            <div className="space-y-2">
                                {selectedReturn.orderItems?.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 border border-slate-100 shadow rounded p-2"
                                    >
                                        <img
                                            src={
                                                item.product?.images?.[0]?.src ||
                                                item.product?.images?.[0] ||
                                                item.image ||
                                                '/favicon.ico'
                                            }
                                            alt={item.product?.name || item.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="text-slate-800">{item.product?.name || item.name}</p>
                                            <p>
                                                <span className="text-[#2582eb]">Qty:</span> {item.quantity}
                                            </p>
                                            <p>
                                                <span className="text-[#2582eb]">Price:</span>{' '}
                                                {currency} {Number(item.price).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Summary</h3>
                            <p>
                                <span className="text-[#2582eb]">Payment Method:</span>{' '}
                                {selectedReturn.paymentMethod}
                            </p>
                            <p>
                                <span className="text-[#2582eb]">Paid:</span>{' '}
                                {selectedReturn.isPaid ? 'Yes' : 'No'}
                            </p>
                            <p>
                                <span className="text-[#2582eb]">Total Refunded:</span>{' '}
                                {currency} {Number(selectedReturn.total).toFixed(2)}
                            </p>
                        </div>

                        {/* Shipment tracking */}
                        {selectedReturn.shipment && (
                            <div className="mb-4">
                                <h3 className="font-semibold mb-2">Tracking</h3>
                                <TrackingTimeline shipment={selectedReturn.shipment} />
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* bottom spacer to match layout convention */}
            <div className="mb-28" />
        </>
    )
}
