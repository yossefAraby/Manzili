'use client'
import Loading from '@/components/Loading'
import Pagination from '@/components/Pagination'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getCurrencySymbol } from '@/lib/currency'

export default function AdminProducts() {
    const currency = getCurrencySymbol()

    const [products, setProducts]           = useState([])
    const [loading, setLoading]             = useState(true)
    const [search, setSearch]               = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/admin/all-products')
            const data = await res.json()
            setProducts(data.products || [])
        } catch {
            toast.error('Failed to load products')
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (productId, action) => {
        const res = await fetch('/api/admin/all-products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, action }),
        })
        if (!res.ok) throw new Error('Failed')
        await fetchProducts()
        if (selectedProduct?.id === productId) setSelectedProduct(null)
    }

    const handleDelete = (productId) => {
        if (!confirm('Delete this product? This cannot be undone.')) return
        toast.promise(handleAction(productId, 'delete'), { loading: 'Deleting...' })
    }

    const handleToggle = (product) => {
        const action = product.isDisabled ? 'enable' : 'disable'
        toast.promise(handleAction(product.id, action), { loading: 'Updating...' })
    }

    useEffect(() => { fetchProducts() }, [])

    const filteredProducts = products.filter(p => {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || (p.store?.name || '').toLowerCase().includes(q)
    })

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    )

    useEffect(() => { setCurrentPage(1) }, [filteredProducts.length])

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

            {filteredProducts.length === 0 ? (
                <p className="text-slate-600 mt-4">No items found.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
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
                                    <tr key={product.id} className="hover:bg-slate-50">
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
                                                    className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition"
                                                >
                                                    Delete
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
                                className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition"
                            >
                                Delete
                            </button>
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
