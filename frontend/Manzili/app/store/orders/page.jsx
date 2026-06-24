'use client'
import { useCallback, useEffect, useMemo, useState } from "react"
import Loading from "@/components/Loading"
import TrackingTimeline from "@/components/TrackingTimeline"
import { useSelector } from "react-redux"
import { fetchSellerOrders, updateOrderStatus as apiUpdateOrderStatus } from "@/lib/api/seller"
import { getCurrencySymbol } from "@/lib/currency"
import {
    PackageIcon,
    CopyIcon,
    CheckIcon,
    ExternalLinkIcon,
    PrinterIcon,
    TruckIcon,
    MapPinIcon,
    UserIcon,
    PhoneIcon,
    MailIcon,
    CreditCardIcon,
    QrCodeIcon,
} from "lucide-react"

// QR endpoint — generates a waybill QR from the tracking number without any npm
// package (just an <img>). Bosta couriers can scan it off the printed slip.
function qrSrc(value, size = 120) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value || "")}`
}

// Map a seller-facing order status to an on-brand pill. Bosta-driven states keep
// the neutral slate / accent palette so the card never looks like a dashboard.
function orderStatusPill(status) {
    switch (String(status || "").toUpperCase()) {
        case "ORDER_PLACED":
            return "bg-[#e67e22]/10 text-[#d35400] border border-[#e67e22]/25"
        case "PROCESSING":
            return "bg-amber-50 text-amber-700 border border-amber-200"
        case "SHIPPED":
        case "IN_TRANSIT":
            return "bg-blue-50 text-blue-700 border border-blue-200"
        case "DELIVERED":
            return "bg-emerald-50 text-emerald-700 border border-emerald-200"
        case "CANCELED":
        case "RETURNED":
            return "bg-rose-50 text-rose-700 border border-rose-200"
        case "PENDING_PAYMENT":
            return "bg-slate-100 text-slate-500 border border-slate-200"
        default:
            return "bg-slate-100 text-slate-600 border border-slate-200"
    }
}

function humanizeStatus(status) {
    return String(status || "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
}

// Real platform currency (EGP) — the page used to hardcode "$".
const CURRENCY = getCurrencySymbol()

function money(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n.toFixed(2) : "0.00"
}

function shortId(id) {
    const s = String(id || "")
    return s.length > 8 ? `#${s.slice(0, 8).toUpperCase()}` : `#${s.toUpperCase()}`
}

function fullAddress(a) {
    if (!a) return ""
    return [a.street, a.district || a.zone || a.state, a.city, a.zip, a.country].filter(Boolean).join(", ")
}

// ─── Copy-to-clipboard tracking chip ────────────────────────────────────────────
function CopyTracking({ value }) {
    const [copied, setCopied] = useState(false)
    if (!value) return null
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            // Clipboard may be unavailable (insecure context); fail silently.
        }
    }
    return (
        <button
            type="button"
            onClick={copy}
            title="Copy tracking number"
            aria-label="Copy tracking number"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 hover:border-[#1c355e]/40 hover:text-[#1c355e] transition"
        >
            {value}
            {copied ? (
                <CheckIcon size={13} className="text-emerald-500" />
            ) : (
                <CopyIcon size={13} className="text-slate-400" />
            )}
        </button>
    )
}

// ─── Shipping & label area ──────────────────────────────────────────────────────
// Tracking number (mono + copy), carrier, shipment status, a scannable QR built
// from the tracking number, the real Bosta AWB link (if any), and a Print button.
function ShippingLabel({ shipment, onPrint }) {
    if (!shipment || typeof shipment !== "object") return null

    const tracking = shipment.trackingNumber
    const carrier = shipment.carrier
        ? shipment.carrier === "BOSTA" ? "Bosta" : shipment.carrier
        : "Bosta"
    const statusText = shipment.statusText
        || (shipment.status ? humanizeStatus(shipment.status) : "")

    return (
        <div className="rounded-xl border border-slate-200 bg-[#faf8f5] p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1c355e] mb-3">
                <PackageIcon size={15} />
                Shipping &amp; label
            </h3>

            <div className="flex flex-col sm:flex-row gap-4">
                {/* Details */}
                <div className="flex-1 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-1.5 text-slate-500">
                            <TruckIcon size={14} /> Carrier
                        </span>
                        <span className="font-medium text-slate-800">{carrier}</span>
                    </div>
                    {statusText && (
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-500">Shipment status</span>
                            <span className="font-medium text-slate-800">{statusText}</span>
                        </div>
                    )}
                    {tracking && (
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-500">Tracking #</span>
                            <CopyTracking value={tracking} />
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onPrint}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#1c355e] hover:bg-[#16294a] px-3 py-2 rounded-lg transition"
                        >
                            <PrinterIcon size={14} /> Print waybill
                        </button>
                        {shipment.awbUrl && (
                            <a
                                href={shipment.awbUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1c355e] border border-[#1c355e]/30 hover:bg-[#1c355e]/5 px-3 py-2 rounded-lg transition"
                            >
                                Open Bosta AWB <ExternalLinkIcon size={12} />
                            </a>
                        )}
                    </div>
                </div>

                {/* QR */}
                {tracking && (
                    <div className="flex flex-col items-center justify-center sm:border-l sm:border-slate-200 sm:pl-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={qrSrc(tracking)}
                                alt={`QR code for tracking ${tracking}`}
                                width={120}
                                height={120}
                                className="block h-[120px] w-[120px]"
                            />
                        </div>
                        <span className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <QrCodeIcon size={12} /> Scan / Waybill
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Printable waybill slip ─────────────────────────────────────────────────────
// Hidden on screen, shown only at print time (see `@media print` rules below).
// Renders store name, order id, tracking + QR, customer + address, and line items.
function PrintableSlip({ order, storeName }) {
    if (!order) return null
    const address = order.order?.address
    const tracking = order.shipment?.trackingNumber

    return (
        <div className="manzili-print-slip" data-print-slip={order.id} aria-hidden="true">
            <div className="ps-head">
                <div>
                    <div className="ps-store">{storeName}</div>
                    <div className="ps-sub">Order waybill</div>
                </div>
                <div className="ps-order">
                    <div className="ps-order-id">{shortId(order.id)}</div>
                    <div className="ps-sub">{new Date(order.createdAt).toLocaleString()}</div>
                </div>
            </div>

            {tracking && (
                <div className="ps-track">
                    <div>
                        <div className="ps-label">Tracking number</div>
                        <div className="ps-track-num">{tracking}</div>
                        <div className="ps-sub">{order.shipment?.carrier === "BOSTA" ? "Bosta" : (order.shipment?.carrier || "Bosta")}</div>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ps-qr" src={qrSrc(tracking, 140)} alt="Waybill QR" width={140} height={140} />
                </div>
            )}

            <div className="ps-grid">
                <div>
                    <div className="ps-label">Ship to</div>
                    <div className="ps-name">{address?.name || "Customer"}</div>
                    {address?.phone && <div>{address.phone}</div>}
                    <div className="ps-addr">{fullAddress(address)}</div>
                </div>
                <div>
                    <div className="ps-label">Payment</div>
                    <div>{order.paymentMethod}</div>
                    <div>{order.isPaid ? "Paid" : "Not paid (COD)"}</div>
                </div>
            </div>

            <table className="ps-items">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th className="ps-r">Qty</th>
                        <th className="ps-r">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {order.orderItems.map((it, i) => (
                        <tr key={i}>
                            <td>{it.product?.name || it.name}</td>
                            <td className="ps-r">{it.quantity}</td>
                            <td className="ps-r">{CURRENCY}{money(it.price)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td className="ps-total" colSpan={2}>Total</td>
                        <td className="ps-r ps-total">{CURRENCY}{money(order.total)}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="ps-foot">Manzili — handmade, from Egypt to your door.</div>
        </div>
    )
}

// ─── Per-order card ─────────────────────────────────────────────────────────────
// The seller drives an order forward one step at a time. COD orders are NOT gated on payment —
// the courier collects the cash on delivery, so the seller can confirm pickup and walk the order
// to Delivered regardless of the "paid" flag. Each step maps to the status the backend accepts.
const NEXT_STEP = {
    ORDER_PLACED: { to: "PROCESSING", label: "Confirm & request pickup" },
    PROCESSING: { to: "SHIPPED", label: "Mark as shipped" },
    SHIPPED: { to: "DELIVERED", label: "Mark as delivered" },
}

function OrderCard({ order, index, onConfirm, confirming }) {
    const address = order.order?.address
    const itemCount = order.orderItems.reduce((n, it) => n + (it.quantity || 0), 0)
    const nextStep = NEXT_STEP[order.status]
    const isTerminal = order.status === "DELIVERED" || order.status === "CANCELED" || order.status === "RETURNED"
    const awaitingPayment = order.status === "PENDING_PAYMENT"

    // Print only this order's slip: mark <html> + the chosen slip so the
    // print-only CSS reveals just that waybill, then restore after printing.
    const handlePrint = () => {
        const root = document.documentElement
        const slip = document.querySelector(
            `.manzili-print-slip[data-print-slip="${CSS.escape(String(order.id))}"]`,
        )
        root.classList.add("manzili-printing")
        if (slip) slip.classList.add("is-printing")
        const cleanup = () => {
            root.classList.remove("manzili-printing")
            if (slip) slip.classList.remove("is-printing")
            window.removeEventListener("afterprint", cleanup)
        }
        window.addEventListener("afterprint", cleanup)
        window.print()
        // Fallback in case afterprint never fires.
        setTimeout(cleanup, 1000)
    }

    return (
        <>
        <article
            data-order-card={order.id}
            className="manzili-order-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
            {/* Header strip */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-[#faf8f5]/70 px-5 py-3.5">
                <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                <span className="font-mono text-sm font-semibold text-[#1c355e]">{shortId(order.id)}</span>
                <span className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString()}
                </span>
                <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${orderStatusPill(order.status)}`}>
                    {humanizeStatus(order.status)}
                </span>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-5">
                {/* Left: customer + items */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Customer + address */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1c355e] mb-2">
                            <UserIcon size={15} /> Customer
                        </h3>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1.5 text-sm text-slate-700">
                            <p className="font-medium text-slate-900">{address?.name || "Customer"}</p>
                            {address?.phone && (
                                <p className="flex items-center gap-1.5 text-slate-600">
                                    <PhoneIcon size={13} className="text-slate-400" /> {address.phone}
                                </p>
                            )}
                            {address?.email && (
                                <p className="flex items-center gap-1.5 text-slate-600">
                                    <MailIcon size={13} className="text-slate-400" /> {address.email}
                                </p>
                            )}
                            {fullAddress(address) && (
                                <p className="flex items-start gap-1.5 text-slate-600">
                                    <MapPinIcon size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                    {fullAddress(address)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Line items */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1c355e] mb-2">
                            <PackageIcon size={15} /> Items
                            <span className="text-xs font-normal text-slate-400">
                                ({itemCount} {itemCount === 1 ? "piece" : "pieces"})
                            </span>
                        </h3>
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                            {order.orderItems.map((item, i) => {
                                const img = item.product?.images?.[0]?.src
                                    || item.product?.images?.[0] || item.image || "/favicon.ico"
                                return (
                                    <li key={i} className="flex items-center gap-3 p-2.5">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={img}
                                            alt={item.product?.name || item.name || "Product"}
                                            className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {item.product?.name || item.name}
                                            </p>
                                            <p className="text-xs text-slate-400">Qty {item.quantity}</p>
                                        </div>
                                        <div className="text-right text-sm">
                                            <p className="font-medium text-slate-800">{CURRENCY}{money(item.price * item.quantity)}</p>
                                            {item.quantity > 1 && (
                                                <p className="text-xs text-slate-400">{CURRENCY}{money(item.price)} ea</p>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>

                {/* Right: payment, total, action, shipping */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Summary */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-slate-500">
                                <CreditCardIcon size={14} /> Payment
                            </span>
                            <span className="font-medium text-slate-800">{order.paymentMethod}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Paid</span>
                            {order.isPaid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                    <CheckIcon size={12} /> Paid
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                                    Unpaid
                                </span>
                            )}
                        </div>
                        {order.order?.isCouponUsed && order.order?.coupon?.code && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Coupon</span>
                                <span className="rounded-full bg-[#e67e22]/10 px-2 py-0.5 text-xs font-medium text-[#d35400]">
                                    {order.order.coupon.code}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                            <span className="text-sm font-medium text-slate-600">Total</span>
                            <span className="text-lg font-semibold text-[#1c355e]">{CURRENCY}{money(order.total)}</span>
                        </div>
                    </div>

                    {/* Fulfilment action — one step at a time (Confirm → Shipped → Delivered).
                        COD orders are NOT blocked by payment; the courier settles on delivery. */}
                    {nextStep ? (
                        <button
                            type="button"
                            onClick={() => onConfirm(order.id, nextStep.to)}
                            disabled={confirming}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#e67e22] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d35400] disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                            <TruckIcon size={16} />
                            {confirming ? "Updating…" : nextStep.label}
                        </button>
                    ) : awaitingPayment ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-center text-xs text-slate-400">
                            Awaiting the customer's online payment before fulfilment can start.
                        </p>
                    ) : isTerminal ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-center text-xs text-slate-400">
                            {order.status === "DELIVERED"
                                ? "Delivered — this order is complete."
                                : order.status === "RETURNED"
                                    ? "This order was returned."
                                    : "This order was canceled."}
                        </p>
                    ) : null}

                    {/* Shipping & label */}
                    <ShippingLabel shipment={order.shipment} onPrint={handlePrint} />
                </div>
            </div>

            {/* Tracking timeline (full width when present) */}
            {order.shipment && (
                <div className="border-t border-slate-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-[#1c355e] mb-2">Tracking history</h3>
                    <TrackingTimeline shipment={order.shipment} />
                </div>
            )}

        </article>
        {/* Hidden printable slip for this order (revealed only at print time) */}
        <PrintableSlip order={order} storeName={order.__storeName} />
        </>
    )
}

export default function StoreOrders() {
    const session = useSelector((s) => s.auth.session)
    const storeId = session?.storeId
    const storeName = session?.name || "Manzili Store"
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [confirmingId, setConfirmingId] = useState(null)

    const fetchOrders = useCallback(async () => {
        if (!storeId) {
            setOrders([])
            setLoading(false)
            return
        }
        setLoading(true)
        // The .NET seller orders endpoint is the only source. On error we render
        // the empty state cleanly (no local fallback).
        try {
            const list = await fetchSellerOrders()
            setOrders(list)
        } catch {
            setOrders([])
        } finally {
            setLoading(false)
        }
    }, [storeId])

    // Behaviour preserved from the original: confirm an order to request pickup,
    // then refetch. Adds only a per-order "in flight" guard so the button can't
    // be double-fired.
    const updateOrderStatus = async (orderId, status) => {
        setConfirmingId(orderId)
        try {
            await apiUpdateOrderStatus(orderId, status)
        } catch {
            setConfirmingId(null)
            return
        }
        await fetchOrders()
        setConfirmingId(null)
    }

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    // Attach the store name onto each order so the printable slip can read it
    // without threading more props through the card.
    const decorated = useMemo(
        () => orders.map((o) => ({ ...o, __storeName: storeName })),
        [orders, storeName],
    )

    if (loading) return <Loading />

    return (
        <>
            {/* Print-only stylesheet. On screen the waybill slips are hidden. When a
                Print button marks <html> with .manzili-printing and tags the chosen
                slip with .is-printing, the whole dashboard collapses to just that
                slip — a clean, single-page waybill. No screen impact otherwise. */}
            <style jsx global>{`
                .manzili-print-slip { display: none; }
                @media print {
                    html.manzili-printing body * { visibility: hidden !important; }
                    html.manzili-printing .manzili-print-slip.is-printing,
                    html.manzili-printing .manzili-print-slip.is-printing * {
                        visibility: visible !important;
                    }
                    html.manzili-printing .manzili-print-slip.is-printing {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
                .manzili-print-slip {
                    color: #1c355e;
                    font-size: 13px;
                    padding: 24px;
                }
                .manzili-print-slip .ps-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #1c355e;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }
                .manzili-print-slip .ps-store { font-size: 20px; font-weight: 700; color: #1c355e; }
                .manzili-print-slip .ps-order { text-align: right; }
                .manzili-print-slip .ps-order-id { font-size: 16px; font-weight: 700; font-family: monospace; }
                .manzili-print-slip .ps-sub { font-size: 11px; color: #64748b; }
                .manzili-print-slip .ps-label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin-bottom: 2px; }
                .manzili-print-slip .ps-track {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                }
                .manzili-print-slip .ps-track-num { font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: .03em; }
                .manzili-print-slip .ps-qr { width: 110px; height: 110px; }
                .manzili-print-slip .ps-grid { display: flex; gap: 32px; margin-bottom: 16px; }
                .manzili-print-slip .ps-name { font-weight: 600; }
                .manzili-print-slip .ps-addr { color: #475569; max-width: 260px; }
                .manzili-print-slip .ps-items { width: 100%; border-collapse: collapse; }
                .manzili-print-slip .ps-items th { text-align: left; border-bottom: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px; text-transform: uppercase; color: #64748b; }
                .manzili-print-slip .ps-items td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; }
                .manzili-print-slip .ps-items .ps-r { text-align: right; }
                .manzili-print-slip .ps-items .ps-total { font-weight: 700; border-bottom: none; padding-top: 10px; }
                .manzili-print-slip .ps-foot { margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            `}</style>

            <header className="mb-6">
                <h1 className="text-2xl text-slate-500">
                    Store <span className="font-medium text-slate-900">Orders</span>
                </h1>
                {decorated.length > 0 && (
                    <p className="mt-1 text-sm text-slate-400">
                        {decorated.length} {decorated.length === 1 ? "order" : "orders"} · confirm pickup, print waybills, track shipments
                    </p>
                )}
            </header>

            {decorated.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#faf8f5] px-6 py-16 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-slate-200 text-[#1c355e]">
                        <PackageIcon size={24} />
                    </span>
                    <h2 className="mt-4 text-lg font-medium text-slate-700">No orders yet</h2>
                    <p className="mt-1 max-w-sm text-sm text-slate-400">
                        When a customer buys one of your handmade pieces, the order — with its shipping label and tracking — will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {decorated.map((order, index) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            index={index}
                            onConfirm={updateOrderStatus}
                            confirming={confirmingId === order.id}
                        />
                    ))}
                </div>
            )}
        </>
    )
}
