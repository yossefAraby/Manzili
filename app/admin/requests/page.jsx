'use client'
import Loading from '@/components/Loading'
import Pagination from '@/components/Pagination'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'

export default function AdminRequests() {
    const [requests, setRequests]           = useState([])
    const [loading, setLoading]             = useState(true)
    const [selectedRequest, setSelectedRequest] = useState(null)

    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 5

    const totalPages = Math.max(1, Math.ceil(requests.length / ITEMS_PER_PAGE))
    const paginatedRequests = requests.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    )

    useEffect(() => { setCurrentPage(1) }, [requests.length])

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/admin/all-requests')
            const data = await res.json()
            setRequests(data.requests || [])
        } catch {
            toast.error('Failed to load requests')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchRequests() }, [])

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl text-slate-500 mb-5">Custom <span className="text-slate-800 font-medium">Requests</span></h1>

            <p className="text-sm text-slate-500 mb-4">
                Collaboration chat messages are stored locally per user and cannot be viewed centrally.
                The request details below show the initial request specifications.
            </p>

            {requests.length === 0 ? (
                <p className="text-slate-600 mt-4">No items found.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Sr.</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Buyer</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Item</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Category</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Store</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Visibility</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Date</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedRequests.map((req, i) => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 text-[#2582eb] font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                                    <td className="py-3 px-4 text-slate-800">
                                        <p>{req.user?.name || '—'}</p>
                                        <p className="text-xs text-slate-400">{req.user?.email}</p>
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{req.itemName}</td>
                                    <td className="py-3 px-4 text-slate-800">{req.category || '—'}</td>
                                    <td className="py-3 px-4 text-slate-800">{req.store?.name || 'Open'}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            req.visibility === 'private'
                                                ? 'bg-slate-100 text-slate-600'
                                                : 'bg-[#2582eb]/10 text-[#2582eb]'
                                        }`}>
                                            {req.visibility || 'open'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{new Date(req.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => setSelectedRequest(req)}
                                            className="text-xs text-[#2582eb] hover:underline cursor-pointer"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">Request Details</h2>
                        <div className="space-y-2">
                            <p><span className="text-[#2582eb]">Item:</span> {selectedRequest.itemName}</p>
                            <p><span className="text-[#2582eb]">Description:</span> {selectedRequest.description}</p>
                            <p><span className="text-[#2582eb]">Category:</span> {selectedRequest.category || '—'}</p>
                            <p><span className="text-[#2582eb]">Quantity:</span> {selectedRequest.quantity ?? '—'}</p>
                            <p>
                                <span className="text-[#2582eb]">Buyer:</span>{' '}
                                {selectedRequest.user?.name} ({selectedRequest.user?.email})
                            </p>
                            <p><span className="text-[#2582eb]">Store:</span> {selectedRequest.store?.name || 'Open'}</p>
                            <p>
                                <span className="text-[#2582eb]">Delivery Date:</span>{' '}
                                {selectedRequest.deliveryDate
                                    ? new Date(selectedRequest.deliveryDate).toLocaleDateString()
                                    : '—'}
                            </p>
                            <p>
                                <span className="text-[#2582eb]">Visibility:</span>{' '}
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    selectedRequest.visibility === 'private'
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-[#2582eb]/10 text-[#2582eb]'
                                }`}>
                                    {selectedRequest.visibility || 'open'}
                                </span>
                            </p>
                            <p><span className="text-[#2582eb]">Images:</span> {selectedRequest.images?.length ?? 0} attached</p>
                            <p><span className="text-[#2582eb]">Submitted:</span> {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={() => setSelectedRequest(null)}
                            className="mt-6 px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
