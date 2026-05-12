'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { productDummyData } from "@/assets/assets"
import { getCurrencySymbol } from "@/lib/currency"
import { XIcon } from "lucide-react"

export default function StoreManageProducts() {

    const currency = getCurrencySymbol()

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [editingProduct, setEditingProduct] = useState(null)
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        mrp: "",
        price: "",
        category: "",
    })

    const fetchProducts = async () => {
        setProducts(productDummyData)
        setLoading(false)
    }

    const toggleStock = async (productId) => {
        setProducts((prev) =>
            prev.map((product) =>
                product.id === productId
                    ? { ...product, inStock: !product.inStock }
                    : product
            )
        )
        return Promise.resolve()
    }

    const openEditModal = (product) => {
        setEditingProduct(product)
        setEditForm({
            name: product.name ?? "",
            description: product.description ?? "",
            mrp: String(product.mrp ?? ""),
            price: String(product.price ?? ""),
            category: product.category ?? "",
        })
    }

    const closeEditModal = () => {
        setEditingProduct(null)
        setEditForm({
            name: "",
            description: "",
            mrp: "",
            price: "",
            category: "",
        })
    }

    const handleSaveEdit = (e) => {
        e.preventDefault()
        if (!editingProduct) return

        const trimmedName = editForm.name.trim()
        const trimmedDescription = editForm.description.trim()
        const trimmedCategory = editForm.category.trim()
        const parsedMrp = Number(editForm.mrp)
        const parsedPrice = Number(editForm.price)

        if (!trimmedName) return toast.error("Product name is required.")
        if (!trimmedDescription) return toast.error("Description is required.")
        if (!trimmedCategory) return toast.error("Category is required.")
        if (Number.isNaN(parsedMrp) || parsedMrp <= 0) return toast.error("MRP must be greater than 0.")
        if (Number.isNaN(parsedPrice) || parsedPrice <= 0) return toast.error("Price must be greater than 0.")
        if (parsedPrice > parsedMrp) return toast.error("Price cannot be greater than MRP.")

        setProducts((prev) =>
            prev.map((product) =>
                product.id === editingProduct.id
                    ? {
                        ...product,
                        name: trimmedName,
                        description: trimmedDescription,
                        category: trimmedCategory,
                        mrp: parsedMrp,
                        price: parsedPrice,
                    }
                    : product
            )
        )

        toast.success("Product updated successfully.")
        closeEditModal()
    }

    useEffect(() => {
            fetchProducts()
    }, [])

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">Manage <span className="text-slate-800 font-medium">Products</span></h1>
            <table className="w-full max-w-4xl text-left  ring ring-slate-200  rounded overflow-hidden text-sm">
                <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="px-4 py-3 hidden md:table-cell">MRP</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-slate-700">
                    {products.map((product) => (
                        <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    <Image width={40} height={40} className='p-1 shadow rounded cursor-pointer' src={product.images[0]} alt="" />
                                    {product.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 max-w-md text-slate-600 hidden md:table-cell truncate">{product.description}</td>
                            <td className="px-4 py-3 hidden md:table-cell">{currency} {product.mrp.toLocaleString()}</td>
                            <td className="px-4 py-3">{currency} {product.price.toLocaleString()}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => openEditModal(product)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                                    >
                                        Edit
                                    </button>
                                <label className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3">
                                    <input type="checkbox" className="sr-only peer" onChange={() => toast.promise(toggleStock(product.id), { loading: "Updating data..." })} checked={product.inStock} />
                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#2582eb] transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                </label>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {editingProduct && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-xl font-semibold text-slate-800">Edit Product</h2>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                                aria-label="Close edit dialog"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="sm:col-span-2">
                                <label className="block mb-1.5 text-slate-600 font-medium">Product Name</label>
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5]"
                                    placeholder="Product name"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block mb-1.5 text-slate-600 font-medium">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] resize-none"
                                    placeholder="Product description"
                                />
                            </div>

                            <div>
                                <label className="block mb-1.5 text-slate-600 font-medium">MRP ({currency})</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={editForm.mrp}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, mrp: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5]"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block mb-1.5 text-slate-600 font-medium">Price ({currency})</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={editForm.price}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5]"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block mb-1.5 text-slate-600 font-medium">Category</label>
                                <input
                                    value={editForm.category}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5]"
                                    placeholder="Category"
                                />
                            </div>

                            <div className="sm:col-span-2 pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl bg-[#1c355e] text-white hover:bg-[#2582eb] transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}