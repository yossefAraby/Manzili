'use client'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { getCurrencySymbol } from '@/lib/currency'
import { fetchReturns, approveReturn, rejectReturn } from '@/lib/api/admin'

const STATUS_LABELS = {
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED:         'Approved',
    REJECTED:         'Rejected',
}

const STATUS_BADGE = {
    PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
    APPROVED:         'bg-emerald-50 text-emerald-700',
    REJECTED:         'bg-red-50 text-red-700',
}

export default function AdminReturns() {
    const currency = getCurrencySymbol()
    const [returns, setReturns]             = useState([])
    const [loading, setLoading]             = useState(true)
    const [selectedReturn, setSelectedReturn] = useState(null)
    const [rejectNote, setRejectNote]       = useState('')
    const [actioning, setActioning]         = useState(false)

    const loadReturns = async () => {
        try {
            // fetchReturns() is fail-safe (returns [] on error/empty DB).
            const list = await fetchReturns()
            setReturns(list || [])
        } catch {
            toast.error('Failed to load returns')
        } finally {
            setLoading(false)
        }
    }

    const openModal = (ret) => {
        setSelectedReturn(ret)
        setRejectNote('')
    }

    const closeModal = () => {
        setSelectedReturn(null)
        setRejectNote('')
    }

    const handleApprove = async () => {
        if (!selectedReturn) return
        setActioning(true)
        try {
            // Runs Bosta reverse pickup + refund + seller wallet reversal.
            await approveReturn(selectedReturn.id)
            toast.success('Return approved — refund & reverse pickup started')
            closeModal()
            await loadReturns()
        } catch {
            toast.error('Failed to approve return')
        } finally {
            setActioning(false)
        }
    }

    const handleReject = async () => {
        if (!selectedReturn) return
        setActioning(true)
        try {
            await rejectReturn(selectedReturn.id, rejectNote || undefined)
            toast.success('Return rejected')
            closeModal()
            await loadReturns()
        } catch {
            toast.error('Failed to reject return')
        } finally {
            setActioning(false)
        }
    }

    useEffect(() => { loadReturns() }, [])

    const pendingCount = (returns || []).filter(r => r.status === 'PENDING_APPROVAL').length

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28">
            {/* Title */}
            <div className="flex items-center gap-3 mb-5">
                <h1 className="text-2xl text-slate-500">Return <span className="text-slate-800 font-medium">Requests</span></h1>
                {pendingCount > 0 && (
                    <span className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                        {pendingCount} pending
                    </span>
                )}
            </div>

            <p className="text-sm text-slate-500 mb-6 max-w-2xl">
                Approving a return triggers the Bosta reverse pickup, refunds the buyer, and reverses
                the seller&apos;s wallet payout. Rejecting leaves the order as delivered with no refund.
            </p>

            {returns.length === 0 ? (
                <p className="text-slate-600 mt-4">No return requests.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Sr.</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Order</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Buyer</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Store</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Reason</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Refund</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Date</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {returns.map((ret, i) => (
                                <tr key={ret.id} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 text-[#2582eb] font-medium">{i + 1}</td>
                                    <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                                        {ret.storeOrderId ? `${ret.storeOrderId.slice(-10).toUpperCase()}` : '—'}
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{ret.customerName || '—'}</td>
                                    <td className="py-3 px-4 text-slate-800">{ret.storeName || '—'}</td>
                                    <td className="py-3 px-4 text-slate-800 max-w-xs truncate">{ret.reason || '—'}</td>
                                    <td className="py-3 px-4 text-slate-800">
                                        {ret.refundAmount != null ? `${currency}${Number(ret.refundAmount).toFixed(2)}` : '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[ret.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {STATUS_LABELS[ret.status] || ret.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{new Date(ret.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => openModal(ret)}
                                            className="text-xs text-[#2582eb] hover:underline cursor-pointer"
                                        >
                                            View & Act
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* View & Act Modal */}
            {selectedReturn && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">Return Details</h2>

                        {/* Status badge */}
                        <div className="flex gap-2 flex-wrap mb-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[selectedReturn.status] || 'bg-slate-100 text-slate-600'}`}>
                                {STATUS_LABELS[selectedReturn.status] || selectedReturn.status}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4">
                            <p><span className="text-[#2582eb]">Order ID:</span> {selectedReturn.storeOrderId || '—'}</p>
                            <p><span className="text-[#2582eb]">Buyer:</span> {selectedReturn.customerName || '—'}</p>
                            <p><span className="text-[#2582eb]">Store:</span> {selectedReturn.storeName || '—'}</p>
                            <p><span className="text-[#2582eb]">Reason:</span> {selectedReturn.reason || '—'}</p>
                            {selectedReturn.refundAmount != null && (
                                <p><span className="text-[#2582eb]">Refund Amount:</span> {currency}{Number(selectedReturn.refundAmount).toFixed(2)}</p>
                            )}
                            <p><span className="text-[#2582eb]">Requested:</span> {new Date(selectedReturn.createdAt).toLocaleDateString()}</p>
                        </div>

                        {/* Items */}
                        {selectedReturn.items?.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs font-semibold text-slate-600 mb-2">Items</p>
                                <div className="space-y-1">
                                    {selectedReturn.items.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between border border-slate-100 rounded px-3 py-2">
                                            <span className="text-slate-800">{item.name}</span>
                                            <span className="text-slate-500 text-xs">Qty: {item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reject note (only while pending) */}
                        {selectedReturn.status === 'PENDING_APPROVAL' && (
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Rejection Note (optional)</label>
                                <textarea
                                    value={rejectNote}
                                    onChange={e => setRejectNote(e.target.value)}
                                    placeholder="Reason for rejecting this return..."
                                    rows={3}
                                    className="border border-slate-200 rounded p-2 w-full text-sm resize-none outline-slate-400"
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            {selectedReturn.status === 'PENDING_APPROVAL' && (
                                <>
                                    <button
                                        disabled={actioning}
                                        onClick={handleApprove}
                                        className="text-xs border border-emerald-200 text-emerald-600 px-3 py-1 rounded hover:bg-emerald-50 transition disabled:opacity-50"
                                    >
                                        Approve & Refund
                                    </button>
                                    <button
                                        disabled={actioning}
                                        onClick={handleReject}
                                        className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
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
        </div>
    )
}
