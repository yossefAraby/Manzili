'use client'
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Link from "next/link"
import Loading from "@/components/Loading"
import Pagination from "@/components/Pagination"
import { getCurrencySymbol } from "@/lib/currency"
import { Trash2Icon, PencilIcon, CheckIcon, PlusIcon, SearchIcon, PackageIcon, SparklesIcon, XIcon, TruckIcon } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { updateProduct, setProduct, removeProduct } from "@/lib/features/product/productSlice"
import {
    updateSellerProduct,
    fetchSellerProducts,
    deleteSellerProduct,
    setSellerProductStatus,
    promotionCheckout,
    confirmPromotion,
    fetchWallet,
} from "@/lib/api/seller"
import { quoteBySize } from "@/lib/shipping/bostaPricing"

function imageSrc(img) {
    if (!img) return '/favicon.ico'
    return typeof img === 'string' ? img : img?.src || '/favicon.ico'
}

const LOW_STOCK = 5
const ITEMS_PER_PAGE = 10

// Manzili takes a 15% commission on the sale price. Delivery is the REAL size-based Bosta estimate
// (a range; it also varies by buyer distance), computed from each product's shipping profile —
// no fixed placeholder fee.
const COMMISSION_RATE = 0.15

// Promotion plans (must match the backend PromotionService).
const PROMO_PLANS = [
    { id: 'day', label: '1 day', price: 50 },
    { id: 'week', label: '1 week', price: 300 },
]

function productStatus(p) {
    if (p.disabled) return 'disabled'
    const stock = Number(p.stock) || 0
    if (stock <= 0) return 'out'
    if (stock < LOW_STOCK) return 'low'
    return 'in'
}

const STATUS_BADGE = {
    in: { label: 'In stock', cls: 'bg-emerald-50 text-emerald-700' },
    low: { label: 'Low stock', cls: 'bg-amber-50 text-amber-700' },
    out: { label: 'Out of stock', cls: 'bg-rose-50 text-rose-700' },
    disabled: { label: 'Disabled', cls: 'bg-slate-100 text-slate-500' },
}

function promotedDaysLeft(until) {
    if (!until) return null
    const ms = new Date(until).getTime() - Date.now()
    if (!Number.isFinite(ms) || ms <= 0) return null
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

export default function StoreManageProducts() {

    const currency = getCurrencySymbol()
    const dispatch = useDispatch()
    const session = useSelector((s) => s.auth.session)
    const productList = useSelector((s) => s.product.list)

    const storeId = session?.storeId

    const products = useMemo(
        () => (storeId ? productList.filter((p) => p.storeId === storeId) : []),
        [productList, storeId],
    )

    const [loading, setLoading] = useState(true)

    // Toolbar
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")

    // Inline stock editing
    const [stockEdits, setStockEdits] = useState({})
    const [savingId, setSavingId] = useState(null)

    const [currentPage, setCurrentPage] = useState(1)

    // Promotion modal
    const [promoteFor, setPromoteFor] = useState(null)
    const [promoting, setPromoting] = useState(false)
    const [wallet, setWallet] = useState(null)          // { availableBalance, pendingBalance, currency }
    const [payMethod, setPayMethod] = useState('wallet') // 'wallet' | 'kashier' | 'stripe'
    const [selectedPlan, setSelectedPlan] = useState('day')

    const categoryOptions = useMemo(() => {
        const set = new Set()
        products.forEach((p) => { if (p.category) set.add(p.category) })
        return Array.from(set).sort()
    }, [products])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        let list = products.filter((p) => {
            if (q && !(p.name || "").toLowerCase().includes(q)) return false
            if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false
            if (statusFilter !== "ALL" && productStatus(p) !== statusFilter) return false
            return true
        })
        const byNum = (v) => Number(v) || 0
        list = [...list].sort((a, b) => {
            switch (sortBy) {
                case "name": return (a.name || "").localeCompare(b.name || "")
                case "priceAsc": return byNum(a.price) - byNum(b.price)
                case "priceDesc": return byNum(b.price) - byNum(a.price)
                case "stock": return byNum(a.stock) - byNum(b.stock)
                case "bestSelling": return byNum(b.totalSold ?? b.sold) - byNum(a.totalSold ?? a.sold)
                case "newest":
                default: return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            }
        })
        return list
    }, [products, search, categoryFilter, statusFilter, sortBy])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    useEffect(() => { setCurrentPage(1) }, [search, categoryFilter, statusFilter, sortBy, filtered.length])

    useEffect(() => {
        let cancelled = false
        if (!storeId) { setLoading(false); return }
        fetchSellerProducts()
            .then((list) => { if (!cancelled) dispatch(setProduct(list.map((p) => ({ ...p, storeId })))) })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [storeId, dispatch])

    const saveStock = async (product) => {
        const raw = stockEdits[product.id]
        const next = Number(raw)
        if (raw === undefined || raw === "" || !Number.isFinite(next) || next < 0) {
            toast.error("Enter a valid stock quantity")
            return
        }
        setSavingId(product.id)
        try {
            await updateSellerProduct(product.id, { stock: next, inStock: next > 0 })
            dispatch(updateProduct({ id: product.id, stock: next, inStock: next > 0 }))
            setStockEdits((prev) => { const n = { ...prev }; delete n[product.id]; return n })
            toast.success("Stock updated")
        } catch (err) {
            toast.error(err?.message || "Could not update stock")
        } finally {
            setSavingId(null)
        }
    }

    const toggleStatus = async (product) => {
        const nextDisabled = !product.disabled
        await setSellerProductStatus(product.id, nextDisabled)
        dispatch(updateProduct({ id: product.id, disabled: nextDisabled }))
    }

    const handleDelete = async (productId) => {
        await deleteSellerProduct(productId)
        dispatch(removeProduct(productId))
    }

    // Open the promote modal: reset the method/plan and load the live wallet balance.
    const openPromote = (product) => {
        setSelectedPlan('day')
        setPayMethod('wallet')
        setPromoteFor(product)
    }

    const handlePromote = async () => {
        if (promoting || !promoteFor) return
        setPromoting(true)
        try {
            const res = await promotionCheckout(promoteFor.id, selectedPlan, payMethod)
            if (res.status === 'redirect' && res.url) {
                // Off to the gateway (mobile wallet / card); we return to /store/manage-product?promo=success.
                window.location.href = res.url
                return
            }
            // Wallet path: charged from the available balance instantly.
            dispatch(updateProduct({ id: promoteFor.id, isPromoted: true, promotedUntil: res.expiresAt }))
            toast.success("Your product is now featured on the homepage 🎉")
            setPromoteFor(null)
        } catch (err) {
            toast.error(err?.message || "Could not start the promotion")
        } finally {
            setPromoting(false)
        }
    }

    // Load the seller's live wallet whenever the promote modal opens, so we show the REAL
    // available/pending balance (the bug was it never fetched the wallet) and can gate wallet-pay.
    useEffect(() => {
        if (!promoteFor) return
        let cancelled = false
        fetchWallet().then((w) => { if (!cancelled) setWallet(w?.wallet || null) }).catch(() => { })
        return () => { cancelled = true }
    }, [promoteFor])

    // Handle the gateway redirect return (?promo=success&gateway=…&session_id=… / &productId=&plan=).
    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const promo = params.get('promo')
        if (promo == null) return
        const gateway = params.get('gateway')
        const sessionId = params.get('session_id')
            ; (async () => {
                try {
                    if (promo === 'success') {
                        let res = null
                        if (sessionId) res = await confirmPromotion({ gateway: 'stripe', sessionId })
                        else if (gateway === 'kashier') res = await confirmPromotion({ gateway: 'kashier', productId: params.get('productId'), plan: params.get('plan'), query: window.location.search })
                        if (res?.status === 'paid') toast.success('Payment confirmed — your product is now featured 🎉')
                        else toast.error('Payment not completed — the product was not featured.')
                    } else {
                        toast.error('Payment canceled — the product was not featured.')
                    }
                } catch { /* non-fatal */ }
                const url = new URL(window.location.href)
                    ;['promo', 'gateway', 'session_id', 'productId', 'plan', 'paymentStatus', 'merchantOrderId', 'orderId', 'transactionId', 'signature', 'amount', 'currency', 'mode'].forEach((k) => url.searchParams.delete(k))
                window.history.replaceState({}, '', url.pathname + (url.search || ''))
                if (storeId) fetchSellerProducts().then((list) => dispatch(setProduct(list.map((p) => ({ ...p, storeId }))))).catch(() => { })
            })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId])

    const inStockCount = useMemo(() => products.filter((p) => productStatus(p) === 'in').length, [products])
    const promotedCount = useMemo(() => products.filter((p) => p.isPromoted).length, [products])

    if (loading) return <Loading />

    const fieldCls = "h-10 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#2582eb]/30 bg-white text-slate-700"

    return (
        <div className="mb-28">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl text-slate-500">Manage <span className="text-slate-800 font-medium">Products</span></h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {products.length} product{products.length === 1 ? '' : 's'}
                        {products.length > 0 && <> · <span className="text-emerald-600">{inStockCount} in stock</span></>}
                        {promotedCount > 0 && <> · <span className="text-[#e67e22]">{promotedCount} featured</span></>}
                    </p>
                </div>
                <Link href="/store/add-product" className="inline-flex items-center gap-1.5 px-4 h-10 text-sm rounded-full bg-[#1c355e] text-white hover:bg-[#2582eb] transition-colors shadow-sm">
                    <PlusIcon size={16} /> Add product
                </Link>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2.5 mt-6 mb-5 items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name…" className={`${fieldCls} w-full pl-9`} />
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={fieldCls}>
                    <option value="ALL">All categories</option>
                    {categoryOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fieldCls}>
                    <option value="ALL">All statuses</option>
                    <option value="in">In stock</option>
                    <option value="low">Low stock</option>
                    <option value="out">Out of stock</option>
                    <option value="disabled">Disabled</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={fieldCls}>
                    <option value="newest">Newest</option>
                    <option value="name">Name (A–Z)</option>
                    <option value="priceAsc">Price (low–high)</option>
                    <option value="priceDesc">Price (high–low)</option>
                    <option value="stock">Stock (low–high)</option>
                    <option value="bestSelling">Best-selling</option>
                </select>
            </div>

            {products.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center">
                    <PackageIcon size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-slate-600">No products yet.</p>
                    <Link href="/store/add-product" className="inline-flex items-center gap-1.5 mt-4 px-4 h-10 text-sm rounded-full bg-[#1c355e] text-white hover:bg-[#2582eb] transition-colors">
                        <PlusIcon size={16} /> Add your first product
                    </Link>
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-slate-600 py-10 text-center">No products match the current filters.</p>
            ) : (
                /* One quiet container; rows are separated by thin dividers, not boxes. */
                <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                    {paginated.map((product) => {
                        const status = productStatus(product)
                        const badge = STATUS_BADGE[status]
                        const stock = Number(product.stock) || 0
                        const hasSale = Number(product.price) > 0 && Number(product.price) < Number(product.mrp)
                        const editing = stockEdits[product.id] !== undefined
                        const sell = Number(product.price || product.mrp) || 0
                        const commission = sell * COMMISSION_RATE
                        const net = Math.max(0, sell - commission)
                        const sold = Number(product.totalSold ?? product.sold) || 0
                        const ship = quoteBySize(product.shippingSize, product.shippingBulkyCategory)
                        const daysLeft = product.isPromoted ? promotedDaysLeft(product.promotedUntil) : null
                        return (
                            <div key={product.id} className={`p-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-slate-50/60 transition-colors ${product.disabled ? 'opacity-60' : ''}`}>
                                {/* Product */}
                                <div className="flex items-center gap-3 lg:flex-1 min-w-0">
                                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                        <Image width={52} height={52} className="h-12 w-auto object-contain" src={imageSrc(product.images?.[0])} alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-slate-800 truncate">{product.name}</p>
                                            {product.isPromoted && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e67e22]/10 text-[#e67e22]">
                                                    <SparklesIcon size={11} /> Featured{daysLeft ? ` · ${daysLeft}d` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] text-slate-500">
                                            {product.category && <span>{product.category}</span>}
                                            <span className={`font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Price + economics (inline, no inner box) */}
                                <div className="lg:w-56 shrink-0 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800">{currency} {sell.toLocaleString()}</span>
                                        {hasSale && <span className="text-xs text-slate-400 line-through">{currency} {Number(product.mrp).toLocaleString()}</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Manzili 15%: <span className="text-rose-600">− {currency} {commission.toFixed(0)}</span> · You earn <span className="font-medium text-emerald-700">{currency} {net.toFixed(0)}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1" title="Estimated from the item's size; the exact Bosta fee also varies with the buyer's distance.">
                                        <TruckIcon size={12} className="text-slate-400" /> Est. delivery ≈ {currency} {ship.low}–{ship.high}
                                    </p>
                                </div>

                                {/* Stock */}
                                <div className="lg:w-24 shrink-0">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Stock</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number" min={0}
                                            value={editing ? stockEdits[product.id] : stock}
                                            onChange={(e) => setStockEdits((prev) => ({ ...prev, [product.id]: e.target.value }))}
                                            className={`w-16 p-1.5 px-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-[#2582eb]/30 ${stock > 0 ? (stock < LOW_STOCK ? "border-amber-300 text-amber-700" : "border-slate-200 text-slate-700") : "border-rose-300 text-rose-600"}`}
                                        />
                                        {editing && (
                                            <button type="button" onClick={() => saveStock(product)} disabled={savingId === product.id} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" title="Save stock">
                                                <CheckIcon size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Sold */}
                                <div className="lg:w-16 shrink-0">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Sold</p>
                                    <p className="font-semibold text-slate-700">{sold}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => openPromote(product)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${product.isPromoted ? 'border border-[#e67e22]/30 text-[#e67e22] hover:bg-[#e67e22]/10' : 'border border-[#e67e22]/40 text-[#e67e22] hover:bg-[#e67e22]/10'}`}
                                        title="Feature this product on the homepage"
                                    >
                                        <SparklesIcon size={13} /> {product.isPromoted ? 'Extend' : 'Promote'}
                                    </button>
                                    <label className="relative inline-flex items-center cursor-pointer" title={product.disabled ? "Disabled — click to enable" : "Enabled — click to disable"}>
                                        <input type="checkbox" className="sr-only peer" checked={!product.disabled}
                                            onChange={() => toast.promise(toggleStatus(product), { loading: "Updating…", success: product.disabled ? "Product enabled" : "Product disabled", error: "Could not update status" })} />
                                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#2582eb] transition-colors duration-200"></div>
                                        <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                    </label>
                                    <Link href={`/store/manage-product/${product.id}/edit`} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" title="Edit">
                                        <PencilIcon size={15} />
                                    </Link>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete "${product.name}"? This removes it from your store.`)) {
                                                toast.promise(handleDelete(product.id), { loading: "Deleting…", success: "Product deleted", error: "Could not delete product" })
                                            }
                                        }}
                                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 active:scale-95 transition-colors"
                                        title="Delete product"
                                    >
                                        <Trash2Icon size={15} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={ITEMS_PER_PAGE} onChange={setCurrentPage} />

            {/* Promote modal */}
            {promoteFor && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !promoting && setPromoteFor(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="w-9 h-9 rounded-xl bg-[#e67e22]/10 flex items-center justify-center"><SparklesIcon size={18} className="text-[#e67e22]" /></span>
                                <h3 className="font-semibold text-slate-800">Feature this product</h3>
                            </div>
                            <button onClick={() => !promoting && setPromoteFor(null)} className="text-slate-400 hover:text-slate-600"><XIcon size={18} /></button>
                        </div>
                        <p className="text-sm text-slate-500 mt-3">
                            Promote <span className="font-medium text-slate-700">{promoteFor.name}</span> to the homepage <span className="font-medium">Featured</span> section. Pay from your wallet balance, or directly with mobile wallet / card. If many sellers are featuring, items rotate through a queue.
                        </p>
                        {promoteFor.isPromoted && promotedDaysLeft(promoteFor.promotedUntil) && (
                            <p className="text-xs text-[#e67e22] bg-[#e67e22]/10 rounded-lg px-3 py-2 mt-3">
                                Currently featured — {promotedDaysLeft(promoteFor.promotedUntil)} day{promotedDaysLeft(promoteFor.promotedUntil) === 1 ? '' : 's'} left. Buying again adds to that.
                            </p>
                        )}

                        {/* Live wallet balance — the real numbers, not a placeholder. */}
                        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm flex items-center justify-between">
                            <span className="text-slate-500">Wallet balance</span>
                            <span className="text-slate-700">
                                <span className="font-semibold">{currency} {Number(wallet?.availableBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> available
                                {Number(wallet?.pendingBalance ?? 0) > 0 && (
                                    <span className="text-slate-400"> · {currency} {Number(wallet.pendingBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} pending</span>
                                )}
                            </span>
                        </div>

                        {/* Plan */}
                        <p className="text-xs font-medium text-slate-500 mt-4 mb-1.5">Plan</p>
                        <div className="grid grid-cols-2 gap-3">
                            {PROMO_PLANS.map((plan) => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    disabled={promoting}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`rounded-xl border p-3 text-center transition-colors disabled:opacity-50 ${selectedPlan === plan.id ? 'border-[#e67e22] bg-[#e67e22]/5 ring-1 ring-[#e67e22]/30' : 'border-slate-200 hover:border-[#e67e22]/50'}`}
                                >
                                    <p className="text-sm text-slate-500">{plan.label}</p>
                                    <p className="text-xl font-bold text-slate-800 mt-0.5">{currency} {plan.price}</p>
                                </button>
                            ))}
                        </div>

                        {/* Payment method */}
                        {(() => {
                            const planPrice = PROMO_PLANS.find((p) => p.id === selectedPlan)?.price || 0
                            const available = Number(wallet?.availableBalance ?? 0)
                            const walletShort = available < planPrice
                            const METHODS = [
                                { id: 'wallet', label: 'Wallet balance', note: walletShort ? 'Not enough available' : 'Instant', disabled: walletShort },
                                { id: 'kashier', label: 'Mobile wallet', note: 'Vodafone Cash / etc.', disabled: false },
                                { id: 'stripe', label: 'Card', note: 'Visa / Mastercard', disabled: false },
                            ]
                            return (
                                <>
                                    <p className="text-xs font-medium text-slate-500 mt-4 mb-1.5">Pay with</p>
                                    <div className="space-y-2">
                                        {METHODS.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                disabled={promoting || m.disabled}
                                                onClick={() => setPayMethod(m.id)}
                                                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${payMethod === m.id ? 'border-[#1c355e] bg-[#1c355e]/5' : 'border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className={`w-3.5 h-3.5 rounded-full border ${payMethod === m.id ? 'border-[#1c355e] bg-[#1c355e]' : 'border-slate-300'}`} />
                                                    <span className="font-medium text-slate-700">{m.label}</span>
                                                </span>
                                                <span className="text-xs text-slate-400">{m.note}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={promoting || (payMethod === 'wallet' && walletShort)}
                                        onClick={handlePromote}
                                        className="mt-5 w-full rounded-xl bg-[#e67e22] hover:bg-[#d35400] text-white font-semibold py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {promoting ? 'Processing…' : `Pay ${currency} ${planPrice} & feature`}
                                    </button>
                                    {payMethod !== 'wallet' && (
                                        <p className="text-[11px] text-slate-400 mt-2 text-center">You'll be redirected to a secure payment page.</p>
                                    )}
                                </>
                            )
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}
