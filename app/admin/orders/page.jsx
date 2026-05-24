'use client'
import Loading from '@/components/Loading'
import Pagination from '@/components/Pagination'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { getCurrencySymbol } from '@/lib/currency'

const STATUS_BADGE = {
    DELIVERED:      'bg-emerald-50 text-emerald-700',
    RETURNED:       'bg-slate-100 text-slate-600',
    CANCELED:       'bg-red-50 text-red-700',
}
const DEFAULT_BADGE = 'bg-[#2582eb]/10 text-[#2582eb]'

export default function AdminOrders() {
    const currency = getCurrencySymbol()

    const [orders, setOrders]           = useState([])
    const [loading, setLoading]         = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 15

    const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE))
    const paginatedOrders = orders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    )

    useEffect(() => { setCurrentPage(1) }, [orders.length])

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/admin/all-orders')
            const data = await res.json()
            setOrders(data.orders || [])
        } catch {
            toast.error('Failed to load orders')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchOrders() }, [])

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl text-slate-500 mb-5">All <span className="text-slate-800 font-medium">Orders</span></h1>

            {orders.length === 0 ? (
                <p className="text-slate-600 mt-4">No items found.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Sr.</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Store</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Customer</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Total</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Payment</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Date</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedOrders.map((order, i) => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 text-[#2582eb] font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                                    <td className="py-3 px-4 text-slate-800">{order.store?.name || '—'}</td>
                                    <td className="py-3 px-4 text-slate-800">
                                        <p>{order.order?.address?.name || '—'}</p>
                                        <p className="text-xs text-slate-400">{order.order?.address?.phone}</p>
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{currency} {order.total}</td>
                                    <td className="py-3 px-4 text-slate-800">{order.paymentMethod}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[order.status] || DEFAULT_BADGE}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-800">{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
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

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">Order Details</h2>
                        <div className="space-y-2 mb-4">
                            <p><span className="text-[#2582eb]">Store:</span> {selectedOrder.store?.name || '—'}</p>
                            <p><span className="text-[#2582eb]">Status:</span>{' '}
                                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[selectedOrder.status] || DEFAULT_BADGE}`}>
                                    {selectedOrder.status}
                                </span>
                            </p>
                            <p><span className="text-[#2582eb]">Payment:</span> {selectedOrder.paymentMethod}</p>
                            <p><span className="text-[#2582eb]">Total:</span> {currency} {selectedOrder.total}</p>
                            {selectedOrder.shipment?.trackingNumber && (
                                <p><span className="text-[#2582eb]">Tracking:</span> {selectedOrder.shipment.trackingNumber}</p>
                            )}
                        </div>

                        {/* Customer */}
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Customer</h3>
                        <div className="space-y-1 mb-4 text-slate-700">
                            <p>{selectedOrder.order?.address?.name}</p>
                            <p>{selectedOrder.order?.address?.phone}</p>
                            <p className="text-slate-500">
                                {[
                                    selectedOrder.order?.address?.street,
                                    selectedOrder.order?.address?.city,
                                    selectedOrder.order?.address?.state,
                                    selectedOrder.order?.address?.country,
                                ].filter(Boolean).join(', ')}
                            </p>
                        </div>

                        {/* Items */}
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Items</h3>
                        <div className="border border-slate-100 rounded-lg overflow-hidden mb-4">
                            {(selectedOrder.orderItems || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center px-3 py-2 even:bg-slate-50">
                                    <span className="text-slate-700">{item.name} × {item.quantity}</span>
                                    <span className="text-slate-500">{currency} {item.price}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setSelectedOrder(null)}
                            className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
