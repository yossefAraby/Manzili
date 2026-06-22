'use client'
import { useState } from 'react'
import { FlagIcon, XIcon } from 'lucide-react'
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { createReport } from '@/lib/api/reports'

const REASONS = {
    NON_HANDMADE_PRODUCT: [
        'reportButton.notHandmade',
        'reportButton.massProduced',
        'reportButton.stockPhotos',
        'reportButton.other',
    ],
    SELLER_MISCONDUCT: [
        'reportButton.sellerUnresponsive',
        'reportButton.sellerRude',
        'reportButton.suspectedScam',
        'reportButton.notFulfilling',
        'reportButton.other',
    ],
    UNFULFILLED_CUSTOM_REQUEST: [
        'reportButton.sellerNotResponding',
        'reportButton.sellerNotFulfillingTerms',
        'reportButton.sellerAbandoned',
        'reportButton.other',
    ],
    GENERAL: [
        'reportButton.policyViolation',
        'reportButton.inappropriateContent',
        'reportButton.spam',
        'reportButton.other',
    ],
}

const TYPE_LABELS = {
    NON_HANDMADE_PRODUCT: 'reportButton.nonHandmadeProduct',
    SELLER_MISCONDUCT: 'reportButton.sellerMisconduct',
    UNFULFILLED_CUSTOM_REQUEST: 'reportButton.unfulfilledCustomRequest',
    GENERAL: 'reportButton.generalIssue',
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
    const t = useTranslate()
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
            // Real submission → POST /reports (lands as PENDING for admins to review).
            await createReport({
                type,
                reason: t(reason),     // send the human-readable reason, not the i18n key
                description,
                productId,
                storeId,
                storeOrderId,
                customRequestId,
            })
            setState('done')
        } catch (err) {
            setState('error')
            setErrMsg(
                err?.status === 401
                    ? 'Please sign in to submit a report.'
                    : (err?.message || 'Could not submit the report. Please try again.')
            )
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
                                <h2 className="text-base font-semibold text-slate-800">{t('reportButton.submitReport')}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{t(TYPE_LABELS[type])}</p>
                            </div>
                            <button type="button" onClick={handleClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                                <XIcon size={16} />
                            </button>
                        </div>

                        {state === 'done' ? (
                            <div className="p-6 text-center">
                                <p className="text-2xl mb-2">✅</p>
                                <p className="font-medium text-slate-800">{t('reportButton.reportSubmitted')}</p>
                                <p className="text-sm text-slate-500 mt-1">{t('reportButton.reviewMessage')}</p>
                                <button onClick={handleClose} className="mt-5 px-6 py-2 bg-slate-800 text-white text-sm rounded-xl hover:bg-slate-900 transition">
                                    {t('reportButton.close')}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
                                <div>
                                    <label className="block mb-1.5 text-slate-600 font-medium">{t('reportButton.reason')}</label>
                                    <select
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        required
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm"
                                    >
                                        <option value="">{t('reportButton.selectReason')}</option>
                                        {reasons.map(r => <option key={r} value={r}>{t(r)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-slate-600 font-medium">
                                        {t('reportButton.additionalDetails')} <span className="font-normal text-slate-400">({t('reportButton.optional')})</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder={t('reportButton.describeIssue')}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm resize-none"
                                    />
                                </div>
                                {state === 'error' && <p className="text-xs text-rose-500">{errMsg}</p>}
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={handleClose}
                                        className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition">
                                        {t('reportButton.cancel')}
                                    </button>
                                    <button type="submit" disabled={state === 'loading' || !reason}
                                        className="flex-1 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900 transition disabled:opacity-50">
                                        {state === 'loading' ? t('reportButton.submitting') : t('reportButton.submitReportBtn')}
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
