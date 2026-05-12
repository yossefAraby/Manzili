'use client'
import { useCallback, useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { useSelector } from "react-redux"

export default function StoreOrders() {
    const session = useSelector((s) => s.auth.session)
    const storeId = session?.storeId
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const fetchOrders = useCallback(async () => {
        if (!storeId) {
            setOrders([])
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`/api/store/orders?storeId=${encodeURIComponent(storeId)}`);
            const data = await res.json();
            setOrders(Array.isArray(data?.storeOrders) ? data.storeOrders : []);
        } catch {
            setOrders([])
        } finally {
            setLoading(false)
        }
    }, [storeId])

    const updateOrderStatus = async (orderId, status) => {
        const res = await fetch('/api/store/orders/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeOrderId: orderId, status }),
        });
        if (!res.ok) return;
        await fetchOrders();
    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">Store <span className="text-slate-800 font-medium">Orders</span></h1>
            {orders.length === 0 ? (
                <p>No orders found</p>
            ) : (
                <div className="overflow-x-auto max-w-4xl rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {["Sr. No.", "Customer", "Total", "Payment", "Coupon", "Status", "Date"].map((heading, i) => (
                                    <th key={i} className="px-4 py-3">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                    onClick={() => openModal(order)}
                                >
                                    <td className="pl-6 text-[#2582eb]" >
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3">{order.order?.address?.name || 'Customer'}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">${order.total}</td>
                                    <td className="px-4 py-3">{order.paymentMethod}</td>
                                    <td className="px-4 py-3">
                                        {order.order?.isCouponUsed ? (
                                            <span className="bg-[#2582eb]/10 text-[#2582eb] text-xs px-2 py-1 rounded-full">
                                                {order.order?.coupon?.code}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation() }}>
                                        <select
                                            value={order.status}
                                            onChange={e => updateOrderStatus(order.id, e.target.value)}
                                            className="border-gray-300 rounded-md text-sm focus:ring focus:ring-blue-200"
                                        >
                                            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                                            <option value="ORDER_PLACED">ORDER_PLACED</option>
                                            <option value="PROCESSING">PROCESSING</option>
                                            <option value="SHIPPED">SHIPPED</option>
                                            <option value="DELIVERED">DELIVERED</option>
                                            <option value="CANCELED">CANCELED</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">
                            Order Details
                        </h2>

                        {/* Customer Details */}
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Customer Details</h3>
                            <p><span className="text-[#2582eb]">Name:</span> {selectedOrder.order?.address?.name}</p>
                            <p><span className="text-[#2582eb]">Email:</span> {selectedOrder.order?.address?.email}</p>
                            <p><span className="text-[#2582eb]">Phone:</span> {selectedOrder.order?.address?.phone}</p>
                            <p><span className="text-[#2582eb]">Address:</span> {`${selectedOrder.order?.address?.street}, ${selectedOrder.order?.address?.city}, ${selectedOrder.order?.address?.state}, ${selectedOrder.order?.address?.zip}, ${selectedOrder.order?.address?.country}`}</p>
                        </div>

                        {/* Products */}
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">Products</h3>
                            <div className="space-y-2">
                                {selectedOrder.orderItems.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 border border-slate-100 shadow rounded p-2">
                                        <img
                                            src={item.product?.images?.[0]?.src || item.product?.images?.[0] || item.image || '/favicon.ico'}
                                            alt={item.product?.name || item.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="text-slate-800">{item.product?.name || item.name}</p>
                                            <p>Qty: {item.quantity}</p>
                                            <p>Price: ${item.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment & Status */}
                        <div className="mb-4">
                            <p><span className="text-[#2582eb]">Payment Method:</span> {selectedOrder.paymentMethod}</p>
                            <p><span className="text-[#2582eb]">Paid:</span> {selectedOrder.isPaid ? "Yes" : "No"}</p>
                            {selectedOrder.order?.isCouponUsed && (
                                <p><span className="text-[#2582eb]">Coupon:</span> {selectedOrder.order?.coupon?.code}</p>
                            )}
                            <p><span className="text-[#2582eb]">Status:</span> {selectedOrder.status}</p>
                            <p><span className="text-[#2582eb]">Order Date:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                            {selectedOrder.shipment?.trackingNumber && (
                                <p><span className="text-[#2582eb]">Tracking:</span> <span className="font-mono">{selectedOrder.shipment.trackingNumber}</span></p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                            <button onClick={closeModal} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300" >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
