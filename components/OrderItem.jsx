'use client'
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import { getCurrencySymbol } from "@/lib/currency";

function getItemImage(item) {
    const fromProduct =
        item?.product?.images?.[0]?.src ||
        item?.product?.images?.[0] ||
        item?.image ||
        null;
    return fromProduct || "/favicon.ico";
}

function formatStatus(status) {
    return String(status || "").replace(/_/g, " ").toLowerCase();
}

const OrderItem = ({ order }) => {

    const currency = getCurrencySymbol();
    const [ratingModal, setRatingModal] = useState(null);

    const { ratings } = useSelector(state => state.rating);

    return (
        <>
            <tr className="text-sm">
                <td className="text-left">
                    <div className="flex flex-col gap-6">
                        {order.orderItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
                                    <Image
                                        className="h-14 w-auto"
                                        src={getItemImage(item)}
                                        alt="product_img"
                                        width={50}
                                        height={50}
                                    />
                                </div>
                                <div className="flex flex-col justify-center text-sm">
                                    <p className="font-medium text-slate-600 text-base">{item.product?.name || item.name}</p>
                                    <p>{currency}{item.price} Qty : {item.quantity} </p>
                                    <p className="mb-1">{new Date(order.createdAt).toDateString()}</p>
                                    <div>
                                        {item?.product?.id && ratings.find(rating => order.id === rating.orderId && item.product.id === rating.productId)
                                            ? <Rating value={ratings.find(rating => order.id === rating.orderId && item.product.id === rating.productId).rating} />
                                            : item?.product?.id ? (
                                                <button onClick={() => setRatingModal({ orderId: order.id, productId: item.product.id })} className={`text-[#2582eb] hover:bg-[#2582eb]/10 transition ${order.status !== "DELIVERED" && 'hidden'}`}>Rate Product</button>
                                            ) : null
                                        }</div>
                                    {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </td>

                <td className="text-center max-md:hidden">{currency}{order.total}</td>

                <td className="text-left max-md:hidden">
                    <p>{order.address.name}, {order.address.street},</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country},</p>
                    <p>{order.address.phone}</p>
                </td>

                <td className="text-left space-y-2 text-sm max-md:hidden">
                    <div
                        className={`flex items-center justify-center gap-1 rounded-full p-1 ${order.status === 'DELIVERED'
                            ? 'text-[#2582eb] bg-[#2582eb]/10'
                            : 'text-slate-500 bg-slate-100'
                            }`}
                    >
                        <DotIcon size={10} className="scale-250" />
                        {formatStatus(order.status)}
                    </div>
                    {order?.shipment?.trackingNumber && (
                        <div className="text-xs text-slate-500">
                            Tracking: <span className="font-mono">{order.shipment.trackingNumber}</span>
                        </div>
                    )}
                </td>
            </tr>
            {/* Mobile */}
            <tr className="md:hidden">
                <td colSpan={5}>
                    <p>{order.address.name}, {order.address.street}</p>
                    <p>{order.address.city}, {order.address.state}, {order.address.zip}, {order.address.country}</p>
                    <p>{order.address.phone}</p>
                    <br />
                    <div className="flex items-center">
                        <span className='text-center mx-auto px-6 py-1.5 rounded bg-[#2582eb]/10 text-[#2582eb]' >
                            {formatStatus(order.status)}
                        </span>
                    </div>
                </td>
            </tr>
            <tr>
                <td colSpan={4}>
                    <div className="border-b border-slate-300 w-6/7 mx-auto" />
                </td>
            </tr>
        </>
    )
}

export default OrderItem