'use client'
import { useState } from 'react'
import { FlagIcon, XIcon } from 'lucide-react'

const REASONS = {
    NON_HANDMADE_PRODUCT: [
        'Product is not handmade / artisanal',
        'Product appears mass-produced or factory-made',
        'Product images are stock photos',
        'Other',
    ],
    SELLER_MISCONDUCT: [
        'Seller is unresponsive',
        'Seller is rude or abusive',
        'Suspected scam or fraud',
        'Not fulfilling orders',
        'Other',
    ],
    UNFULFILLED_CUSTOM_REQUEST: [
        'Seller is not responding to my request',
        'Seller is not fulfilling agreed terms',
        'Seller abandoned the collaboration',
        'Other',
    ],
    GENERAL: [
        'Platform policy violation',
        'Inappropriate content',
        'Spam',
        'Other',
    ],
}

const TYPE_LABELS = {
    NON_HANDMADE_PRODUCT: 'Non-Handmade Product',
    SELLER_MISCONDUCT: 'Seller Misconduct',
    UNFULFILLED_CUSTOM_REQUEST: 'Unfulfilled Custom Request',
    GENERAL: 'General Issue',
}

export default function ReportButton({
    type,           // 'NON_HANDMADE_PRODUCT' | 'SELLER_MISCONDUCT' | 'UNFULFILLED_CUSTOM_REQUEST' | 'GENERAL'
    productId,
    storeId,
    storeOrderId,
    customRequestId,
    reporterId,
    label = 'Report',
    className = '',
}) {
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [description, setDescription] = useState('')
    const [state, setState] = useState('idle') // idle | loading | done | error
    const [errMsg, setErrMsg] = useState('')

    const reasons = REASONS[type] || REASONS.GENERAL

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!reason) return
        setState('loading')
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporterId: reporterId || null,
                    type,
                    reason,
                    description,
                    productId: productId || null,
                    storeId: storeId || null,
                    storeOrderId: storeOrderId || null,
                    customRequestId: customRequestId || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || 'Failed to submit report')
            setState('done')
        } catch (err) {
            setErrMsg(err?.message || 'Something went wrong. Please try again.')
            setState('error')
        }
    }

    const handleClose = () => {
        setOpen(false)
        setTimeout(() => { setState('idle'); setReason(''); setDescription(''); setErrMsg('') }, 300)
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition ${className}`}
            >
                <FlagIcon size={12} />
                {label}
            </button>

            {open && (
                <div
                    onClick={handleClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-base font-semibold text-slate-800">Submit a Report</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{TYPE_LABELS[type]}</p>
                            </div>
                            <button type="button" onClick={handleClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                                <XIcon size={16} />
                            </button>
                        </div>

                        {state === 'done' ? (
                            <div className="p-6 text-center">
                                <p className="text-2xl mb-2">✅</p>
                                <p className="font-medium text-slate-800">Report submitted</p>
                                <p className="text-sm text-slate-500 mt-1">Our team will review it shortly. Thank you for keeping Manzili safe.</p>
                                <button onClick={handleClose} className="mt-5 px-6 py-2 bg-slate-800 text-white text-sm rounded-xl hover:bg-slate-900 transition">
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
                                <div>
                                    <label className="block mb-1.5 text-slate-600 font-medium">Reason</label>
                                    <select
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        required
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm"
                                    >
                                        <option value="">Select a reason…</option>
                                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-slate-600 font-medium">
                                        Additional details <span className="font-normal text-slate-400">(optional)</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Describe the issue…"
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm resize-none"
                                    />
                                </div>
                                {state === 'error' && <p className="text-xs text-rose-500">{errMsg}</p>}
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={handleClose}
                                        className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={state === 'loading' || !reason}
                                        className="flex-1 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900 transition disabled:opacity-50">
                                        {state === 'loading' ? 'Submitting…' : 'Submit Report'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
