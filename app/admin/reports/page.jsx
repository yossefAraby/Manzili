'use client'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'

const TYPE_LABELS = {
    NON_HANDMADE_PRODUCT:       'Non-Handmade Product',
    SELLER_MISCONDUCT:          'Seller Misconduct',
    UNFULFILLED_CUSTOM_REQUEST: 'Unfulfilled Request',
    GENERAL:                    'General',
}

const TYPE_BADGE = {
    NON_HANDMADE_PRODUCT:       'bg-amber-50 text-amber-700',
    SELLER_MISCONDUCT:          'bg-red-50 text-red-700',
    UNFULFILLED_CUSTOM_REQUEST: 'bg-[#2582eb]/10 text-[#2582eb]',
    GENERAL:                    'bg-slate-100 text-slate-600',
}

const STATUS_BADGE = {
    PENDING:   'bg-amber-50 text-amber-700',
    REVIEWED:  'bg-[#2582eb]/10 text-[#2582eb]',
    RESOLVED:  'bg-emerald-50 text-emerald-700',
    DISMISSED: 'bg-slate-100 text-slate-600',
}

const FILTER_TABS = ['ALL', 'PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']

function getTarget(report) {
    if (report.productId)       return `Product: ${report.productId.slice(0, 8)}…`
    if (report.storeId)         return `Store: ${report.storeId.slice(0, 8)}…`
    if (report.storeOrderId)    return `Order: ${report.storeOrderId.slice(0, 8)}…`
    if (report.customRequestId) return `Request: ${report.customRequestId.slice(0, 8)}…`
    return '—'
}

export default function AdminReports() {
    const [reports, setReports]           = useState([])
    const [loading, setLoading]           = useState(true)
    const [filterStatus, setFilterStatus] = useState('ALL')
    const [selectedReport, setSelectedReport] = useState(null)
    const [adminNote, setAdminNote]       = useState('')
    const [actioning, setActioning]       = useState(false)
    const [disableProduct, setDisableProduct] = useState(false)
    const [disableStore, setDisableStore]     = useState(false)

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/admin/reports')
            const data = await res.json()
            setReports(data.reports || [])
        } catch {
            toast.error('Failed to load reports')
        } finally {
            setLoading(false)
        }
    }

    const openModal = (report) => {
        setSelectedReport(report)
        setAdminNote(report.adminNote || '')
        setDisableProduct(false)
        setDisableStore(false)
    }

    const closeModal = () => {
        setSelectedReport(null)
        setAdminNote('')
        setDisableProduct(false)
        setDisableStore(false)
    }

    const handleAction = async (action) => {
        if (!selectedReport) return
        setActioning(true)
        try {
            const res = await fetch(`/api/admin/reports/${selectedReport.id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    adminNote: adminNote || undefined,
                    disableProduct: action === 'resolve' ? disableProduct : undefined,
                    disableStore:   action === 'resolve' ? disableStore   : undefined,
                }),
            })
            if (!res.ok) throw new Error('Failed')
            toast.success(`Report ${action}d successfully`)
            closeModal()
            await fetchReports()
        } catch {
            toast.error(`Failed to ${action} report`)
        } finally {
            setActioning(false)
        }
    }

    useEffect(() => { fetchReports() }, [])

    const pendingCount = reports.filter(r => r.status === 'PENDING').length
    const filteredReports = filterStatus === 'ALL'
        ? reports
        : reports.filter(r => r.status === filterStatus)

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28">
            {/* Title */}
            <div className="flex items-center gap-3 mb-5">
                <h1 className="text-2xl text-slate-500">Site <span className="text-slate-800 font-medium">Reports</span></h1>
                {pendingCount > 0 && (
                    <span className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                        {pendingCount} pending
                    </span>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
                {FILTER_TABS.map(f => (
                    <button key={f} onClick={() => setFilterStatus(f)}
                        className={`text-sm px-4 py-1.5 rounded-full border transition ${filterStatus === f ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {f}
                    </button>
                ))}
            </div>

            {filteredReports.length === 0 ? (
                <p className="text-slate-600 mt-4">No items found.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Sr.</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Type</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Reason</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Reporter</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Target</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Date</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredReports.map((report, i) => (
                                <tr key={report.id} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 text-[#2582eb] font-medium">{i + 1}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${TYPE_BADGE[report.type] || 'bg-slate-100 text-slate-600'}`}>
                                            {TYPE_LABELS[report.type] || report.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{report.reason}</td>
                                    <td className="py-3 px-4 text-slate-800">{report.reporter?.name || 'Anonymous'}</td>
                                    <td className="py-3 px-4 text-slate-500 text-xs">{getTarget(report)}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[report.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{new Date(report.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => openModal(report)}
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
            {selectedReport && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">Report Details</h2>

                        {/* Meta badges */}
                        <div className="flex gap-2 flex-wrap mb-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${TYPE_BADGE[selectedReport.type] || 'bg-slate-100 text-slate-600'}`}>
                                {TYPE_LABELS[selectedReport.type] || selectedReport.type}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[selectedReport.status] || 'bg-slate-100 text-slate-600'}`}>
                                {selectedReport.status}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4">
                            <p><span className="text-[#2582eb]">Reason:</span> {selectedReport.reason}</p>
                            <p><span className="text-[#2582eb]">Description:</span> {selectedReport.description}</p>
                            <p>
                                <span className="text-[#2582eb]">Reporter:</span>{' '}
                                {selectedReport.reporter
                                    ? `${selectedReport.reporter.name} (${selectedReport.reporter.email})`
                                    : 'Anonymous'}
                            </p>
                            {selectedReport.productId && (
                                <p><span className="text-[#2582eb]">Product ID:</span> {selectedReport.productId}</p>
                            )}
                            {selectedReport.storeId && (
                                <p><span className="text-[#2582eb]">Store ID:</span> {selectedReport.storeId}</p>
                            )}
                            {selectedReport.storeOrderId && (
                                <p><span className="text-[#2582eb]">Order ID:</span> {selectedReport.storeOrderId}</p>
                            )}
                            {selectedReport.customRequestId && (
                                <p><span className="text-[#2582eb]">Request ID:</span> {selectedReport.customRequestId}</p>
                            )}
                            <p><span className="text-[#2582eb]">Date Submitted:</span> {new Date(selectedReport.createdAt).toLocaleDateString()}</p>
                            {selectedReport.adminNote && (
                                <p className="italic text-slate-500">
                                    <span className="text-[#2582eb] not-italic">Admin Note:</span> {selectedReport.adminNote}
                                </p>
                            )}
                        </div>

                        {/* Admin note textarea (only for PENDING or REVIEWED) */}
                        {(selectedReport.status === 'PENDING' || selectedReport.status === 'REVIEWED') && (
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Admin Note</label>
                                <textarea
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                    placeholder="Add an internal note..."
                                    rows={3}
                                    className="border border-slate-200 rounded p-2 w-full text-sm resize-none outline-slate-400"
                                />
                            </div>
                        )}

                        {/* Resolve checkboxes */}
                        {(selectedReport.status === 'PENDING' || selectedReport.status === 'REVIEWED') && (
                            <div className="flex flex-col gap-2 mb-4 text-sm">
                                {selectedReport.productId && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={disableProduct}
                                            onChange={e => setDisableProduct(e.target.checked)}
                                            className="accent-[#2582eb]"
                                        />
                                        Also disable the reported product
                                    </label>
                                )}
                                {selectedReport.storeId && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={disableStore}
                                            onChange={e => setDisableStore(e.target.checked)}
                                            className="accent-[#2582eb]"
                                        />
                                        Also disable the reported store
                                    </label>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            {selectedReport.status === 'PENDING' && (
                                <button
                                    disabled={actioning}
                                    onClick={() => handleAction('review')}
                                    className="text-xs border border-[#2582eb]/40 text-[#2582eb] px-3 py-1 rounded hover:bg-[#2582eb]/10 transition disabled:opacity-50"
                                >
                                    Mark Reviewed
                                </button>
                            )}
                            {(selectedReport.status === 'PENDING' || selectedReport.status === 'REVIEWED') && (
                                <>
                                    <button
                                        disabled={actioning}
                                        onClick={() => handleAction('resolve')}
                                        className="text-xs border border-emerald-200 text-emerald-600 px-3 py-1 rounded hover:bg-emerald-50 transition disabled:opacity-50"
                                    >
                                        Resolve
                                    </button>
                                    <button
                                        disabled={actioning}
                                        onClick={() => handleAction('dismiss')}
                                        className="text-xs border border-slate-200 text-slate-600 px-3 py-1 rounded hover:bg-slate-50 transition disabled:opacity-50"
                                    >
                                        Dismiss
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
