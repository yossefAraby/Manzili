'use client'
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Link from "next/link"
import Loading from "@/components/Loading"
import Pagination from "@/components/Pagination"
import { getCurrencySymbol } from "@/lib/currency"
import { Trash2Icon, PencilIcon, CheckIcon } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { updateProduct, setProduct, removeProduct } from "@/lib/features/product/productSlice"
import {
    updateSellerProduct,
    fetchSellerProducts,
    deleteSellerProduct,
    setSellerProductStatus,
} from "@/lib/api/seller"

function imageSrc(img) {
    if (!img) return '/favicon.ico'
    return typeof img === 'string' ? img : img?.src || '/favicon.ico'
}

const LOW_STOCK = 5
const ITEMS_PER_PAGE = 10

// Derived status used by the toolbar filter + the status badge.
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

    // ── Toolbar state ──
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL") // ALL | in | low | out | disabled
    const [sortBy, setSortBy] = useState("newest") // newest | name | priceAsc | priceDesc | stock | bestSelling

    // ── Inline stock editing ──
    const [stockEdits, setStockEdits] = useState({}) // { [id]: "value" }
    const [savingId, setSavingId] = useState(null)

    const [currentPage, setCurrentPage] = useState(1)

    // Distinct categories for the filter dropdown.
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
                case "name":
                    return (a.name || "").localeCompare(b.name || "")
                case "priceAsc":
                    return byNum(a.price) - byNum(b.price)
                case "priceDesc":
                    return byNum(b.price) - byNum(a.price)
                case "stock":
                    return byNum(a.stock) - byNum(b.stock)
                case "bestSelling":
                    return byNum(b.totalSold ?? b.sold) - byNum(a.totalSold ?? a.sold)
                case "newest":
                default:
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            }
        })
        return list
    }, [products, search, categoryFilter, statusFilter, sortBy])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const paginated = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    )

    // Reset to page 1 whenever the filtered set changes size.
    useEffect(() => { setCurrentPage(1) }, [search, categoryFilter, statusFilter, sortBy, filtered.length])

    // Load THIS seller's products from the API into the catalog list.
    useEffect(() => {
        let cancelled = false
        if (!storeId) { setLoading(false); return }
        fetchSellerProducts()
            // The seller list DTO carries no store id, so tag each product with this
            // seller's storeId — otherwise the `p.storeId === storeId` filter (and the
            // storefront link) would drop them all.
            .then((list) => { if (!cancelled) dispatch(setProduct(list.map((p) => ({ ...p, storeId })))) })
            .catch(() => { /* fail-safe: keep whatever's in the list */ })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [storeId, dispatch])

    // ── Inline stock save ──
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

    // ── Real enable/disable status toggle (distinct from stock) ──
    const toggleStatus = async (product) => {
        const nextDisabled = !product.disabled
        // Persist first; reflect in Redux only on success.
        await setSellerProductStatus(product.id, nextDisabled)
        dispatch(updateProduct({ id: product.id, disabled: nextDisabled }))
    }

    const handleDelete = async (productId) => {
        await deleteSellerProduct(productId)
        dispatch(removeProduct(productId))
    }

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">Manage <span className="text-slate-800 font-medium">Products</span></h1>

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap gap-3 mb-5 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Search</label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name…"
                        className="p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400 w-56"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Category</label>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400 bg-white"
                    >
                        <option value="ALL">All categories</option>
                        {categoryOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400 bg-white"
                    >
                        <option value="ALL">All</option>
                        <option value="in">In stock</option>
                        <option value="low">Low stock</option>
                        <option value="out">Out of stock</option>
                        <option value="disabled">Disabled</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Sort</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400 bg-white"
                    >
                        <option value="newest">Newest</option>
                        <option value="name">Name (A–Z)</option>
                        <option value="priceAsc">Price (low–high)</option>
                        <option value="priceDesc">Price (high–low)</option>
                        <option value="stock">Stock (low–high)</option>
                        <option value="bestSelling">Best-selling</option>
                    </select>
                </div>
                <Link
                    href="/store/add-product"
                    className="ml-auto px-4 py-2 text-sm rounded-lg bg-[#1c355e] text-white hover:bg-[#2582eb] transition-colors"
                >
                    + Add product
                </Link>
            </div>

            {products.length === 0 ? (
                <p className="text-slate-600">No products for this store yet. Add products from the Add Product page.</p>
            ) : filtered.length === 0 ? (
                <p className="text-slate-600">No products match the current filters.</p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full max-w-5xl text-left ring ring-slate-200 rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 hidden md:table-cell">Category</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3 hidden lg:table-cell">Sold</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {paginated.map((product) => {
                        const status = productStatus(product)
                        const badge = STATUS_BADGE[status]
                        const stock = Number(product.stock) || 0
                        const hasSale = Number(product.price) > 0 && Number(product.price) < Number(product.mrp)
                        const editing = stockEdits[product.id] !== undefined
                        return (
                        <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    <Image width={40} height={40} className='p-1 shadow rounded' src={imageSrc(product.images?.[0])} alt="" />
                                    <span className="font-medium text-slate-700">{product.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-slate-600">{product.category || "—"}</td>
                            <td className="px-4 py-3">
                                {hasSale ? (
                                    <span className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800">{currency} {Number(product.price).toLocaleString()}</span>
                                        <span className="text-xs text-slate-400 line-through">{currency} {Number(product.mrp).toLocaleString()}</span>
                                    </span>
                                ) : (
                                    <span className="font-medium text-slate-800">{currency} {Number(product.mrp).toLocaleString()}</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        value={editing ? stockEdits[product.id] : stock}
                                        onChange={(e) =>
                                            setStockEdits((prev) => ({ ...prev, [product.id]: e.target.value }))
                                        }
                                        className={`w-16 p-1 px-2 text-sm border rounded outline-slate-400 ${
                                            stock > 0
                                                ? (stock < LOW_STOCK ? "border-amber-300 text-amber-700" : "border-slate-200 text-slate-700")
                                                : "border-rose-300 text-rose-600"
                                        }`}
                                    />
                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={() => saveStock(product)}
                                            disabled={savingId === product.id}
                                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                            title="Save stock"
                                        >
                                            <CheckIcon size={16} />
                                        </button>
                                    )}
                                    {stock > 0 && stock < LOW_STOCK && !editing && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Low</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{Number(product.totalSold ?? product.sold) || 0}</td>
                            <td className="px-4 py-3">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={`/store/manage-product/${product.id}/edit`}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors inline-flex items-center gap-1"
                                    >
                                        <PencilIcon size={13} /> Edit
                                    </Link>
                                    {/* REAL enable/disable toggle (drives Product.IsDisabled) */}
                                    <label
                                        className="relative inline-flex items-center cursor-pointer gap-2"
                                        title={product.disabled ? "Disabled — click to enable" : "Enabled — click to disable"}
                                    >
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={!product.disabled}
                                            onChange={() =>
                                                toast.promise(toggleStatus(product), {
                                                    loading: "Updating…",
                                                    success: product.disabled ? "Product enabled" : "Product disabled",
                                                    error: "Could not update status",
                                                })
                                            }
                                        />
                                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#2582eb] transition-colors duration-200"></div>
                                        <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                    </label>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete "${product.name}"? This removes it from your store.`)) {
                                                toast.promise(handleDelete(product.id), {
                                                    loading: "Deleting…",
                                                    success: "Product deleted",
                                                    error: "Could not delete product",
                                                })
                                            }
                                        }}
                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 active:scale-95 transition-colors"
                                        title="Delete product"
                                    >
                                        <Trash2Icon size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
            </div>
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
        </>
    )
}
