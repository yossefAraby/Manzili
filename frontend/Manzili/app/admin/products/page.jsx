'use client'
import Loading from '@/components/Loading'
import Pagination from '@/components/Pagination'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { getCurrencySymbol } from '@/lib/currency'
import { fetchProducts, productAction, fetchAdminMe } from '@/lib/api/admin'

export default function AdminProducts() {
    const currency = getCurrencySymbol()

    const [products, setProducts]           = useState([])
    const [loading, setLoading]             = useState(true)
    const [search, setSearch]               = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [me, setMe] = useState(null)
    const [selected, setSelected] = useState(() => new Set()) // multi-select (product ids)
    const [busy, setBusy] = useState(false)
    const ITEMS_PER_PAGE = 10

    const isSuper = Boolean(me?.isSuperAdmin) // hard-delete is full-admins only

    const loadProducts = async () => {
        try {
            const list = await fetchProducts()
            setProducts(list || [])
            setSelected(new Set())
        } catch {
            toast.error('Failed to load products')
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (productId, action) => {
        await productAction({ productId, action })
        await loadProducts()
        if (selectedProduct?.id === productId) setSelectedProduct(null)
    }

    const handleDelete = (productId) => {
        if (!confirm('Hide this product (soft delete)? It stays in order history.')) return
        toast.promise(handleAction(productId, 'delete'), { loading: 'Hiding...' })
    }

    // Permanent hard-delete — full admins only. Removes the product + all its
    // dependent rows. The backend re-enforces the full-admin check.
    const handlePurge = (productId, name) => {
        if (!confirm(`PERMANENTLY delete "${name || 'this product'}" and all its data? This CANNOT be undone.`)) return
        toast.promise(handleAction(productId, 'purge'), { loading: 'Deleting permanently...', success: 'Permanently deleted', error: 'Could not delete' })
    }

    const handleToggle = (product) => {
        const action = product.isDisabled ? 'enable' : 'disable'
        toast.promise(handleAction(product.id, action), { loading: 'Updating...' })
    }

    useEffect(() => {
        loadProducts()
        fetchAdminMe().then(setMe).catch(() => {})
    }, [])

    const filteredProducts = useMemo(() => (products || []).filter(p => {
        const q = search.toLowerCase()
        return (p.name || '').toLowerCase().includes(q) || (p.store?.name || '').toLowerCase().includes(q)
    }), [products, search])

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    )

    useEffect(() => { setCurrentPage(1) }, [filteredProducts.length])

    // ---- multi-select ----
    const toggleOne = (id) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })
    const pageIds = paginatedProducts.map(p => p.id)
    const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))
    const togglePage = () => setSelected(prev => {
        const next = new Set(prev)
        if (allOnPageSelected) pageIds.forEach(id => next.delete(id))
        else pageIds.forEach(id => next.add(id))
        return next
    })

    // Run a bulk action over every selected product, then reload once.
    const runBulk = async (action, label) => {
        const ids = [...selected]
        if (ids.length === 0) return
        if (action === 'purge' && !confirm(`PERMANENTLY delete ${ids.length} product(s) and all their data? This CANNOT be undone.`)) return
        if (action === 'delete' && !confirm(`Hide ${ids.length} product(s)?`)) return
        setBusy(true)
        let ok = 0, fail = 0
        await Promise.all(ids.map(id => productAction({ productId: id, action }).then(() => ok++).catch(() => fail++)))
        setBusy(false)
        await loadProducts()
        toast[fail ? 'error' : 'success'](`${label}: ${ok} done${fail ? `, ${fail} failed` : ''}`)
    }

    const getStatusBadge = (p) => {
        if (p.isDisabled)   return { label: 'Disabled',     cls: 'bg-red-50 text-red-700' }
        if (p.inStock)      return { label: 'In Stock',     cls: 'bg-emerald-50 text-emerald-700' }
        return               { label: 'Out of Stock', cls: 'bg-amber-50 text-amber-700' }
    }

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl text-slate-500 mb-5">All <span className="text-slate-800 font-medium">Products</span></h1>

            {/* Search */}
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or store..."
                className="p-2 border border-slate-200 rounded-md outline-slate-400 text-sm max-w-xs mb-2"
            />

            {/* Bulk action bar — appears when rows are selected */}
            {selected.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-800 text-white rounded-lg px-4 py-2 my-3 text-sm">
                    <span className="font-medium">{selected.size} selected</span>
                    <span className="flex-1" />
                    <button disabled={busy} onClick={() => runBulk('enable', 'Enabled')} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition disabled:opacity-50">Enable</button>
                    <button disabled={busy} onClick={() => runBulk('disable', 'Disabled')} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition disabled:opacity-50">Disable</button>
                    <button disabled={busy} onClick={() => runBulk('delete', 'Hidden')} className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 transition disabled:opacity-50">Hide</button>
                    {isSuper && (
                        <button disabled={busy} onClick={() => runBulk('purge', 'Deleted')} className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50">Delete permanently</button>
                    )}
                    <button disabled={busy} onClick={() => setSelected(new Set())} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition">Clear</button>
                </div>
            )}

            {filteredProducts.length === 0 ? (
                <p className="text-slate-600 mt-4">No items found.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-3">
                                    <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} aria-label="Select all on page" />
                                </th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Sr.</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Product</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Store</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Price</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Stock</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedProducts.map((product, i) => {
                                const badge = getStatusBadge(product)
                                return (
                                    <tr key={product.id} className={`hover:bg-slate-50 ${selected.has(product.id) ? 'bg-blue-50/40' : ''}`}>
                                        <td className="py-3 px-3">
                                            <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggleOne(product.id)} aria-label={`Select ${product.name}`} />
                                        </td>
                                        <td className="py-3 px-4 text-[#2582eb] font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {product.images?.[0] && (
                                                    <Image
                                                        src={product.images[0]}
                                                        alt={product.name}
                                                        width={32}
                                                        height={32}
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                )}
                                                <span className="text-slate-800 font-medium">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-800">{product.store?.name || '—'}</td>
                                        <td className="py-3 px-4 text-slate-800">{currency} {product.price}</td>
                                        <td className="py-3 px-4 text-slate-800">{product.inStock ? 'Yes' : 'No'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    onClick={() => setSelectedProduct(product)}
                                                    className="text-xs text-[#2582eb] hover:underline cursor-pointer"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleToggle(product)}
                                                    className={`text-xs px-3 py-1 rounded border transition ${
                                                        product.isDisabled
                                                            ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                                            : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                                    }`}
                                                >
                                                    {product.isDisabled ? 'Enable' : 'Disable'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="text-xs border border-amber-200 text-amber-600 px-3 py-1 rounded hover:bg-amber-50 transition"
                                                >
                                                    Hide
                                                </button>
                                                {isSuper && (
                                                    <button
                                                        onClick={() => handlePurge(product.id, product.name)}
                                                        className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition"
                                                        title="Permanently delete (full admin only)"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
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

            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">Product Details</h2>
                        {selectedProduct.images?.[0] && (
                            <Image
                                src={selectedProduct.images[0]}
                                alt={selectedProduct.name}
                                width={80}
                                height={80}
                                className="w-20 h-20 rounded-lg object-cover mb-4"
                            />
                        )}
                        <div className="space-y-2">
                            <p><span className="text-[#2582eb]">Name:</span> {selectedProduct.name}</p>
                            <p><span className="text-[#2582eb]">Description:</span> {selectedProduct.description.slice(0, 200)}{selectedProduct.description.length > 200 ? '…' : ''}</p>
                            <p><span className="text-[#2582eb]">Store:</span> {selectedProduct.store?.name || '—'}</p>
                            <p><span className="text-[#2582eb]">Price:</span> {currency} {selectedProduct.price}</p>
                            <p><span className="text-[#2582eb]">MRP:</span> {currency} {selectedProduct.mrp}</p>
                            <p><span className="text-[#2582eb]">Category:</span> {selectedProduct.category}</p>
                            <p><span className="text-[#2582eb]">In Stock:</span> {selectedProduct.inStock ? 'Yes' : 'No'}</p>
                            <p>
                                <span className="text-[#2582eb]">Status:</span>{' '}
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(selectedProduct).cls}`}>
                                    {getStatusBadge(selectedProduct).label}
                                </span>
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6 flex-wrap">
                            <button
                                onClick={() => handleToggle(selectedProduct)}
                                className={`text-xs px-3 py-1 rounded border transition ${
                                    selectedProduct.isDisabled
                                        ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                        : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                }`}
                            >
                                {selectedProduct.isDisabled ? 'Enable' : 'Disable'}
                            </button>
                            <button
                                onClick={() => handleDelete(selectedProduct.id)}
                                className="text-xs border border-amber-200 text-amber-600 px-3 py-1 rounded hover:bg-amber-50 transition"
                            >
                                Hide
                            </button>
                            {isSuper && (
                                <button
                                    onClick={() => handlePurge(selectedProduct.id, selectedProduct.name)}
                                    className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition"
                                >
                                    Delete permanently
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedProduct(null)}
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
