'use client'
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import Pagination from "@/components/Pagination"
import { getCurrencySymbol } from "@/lib/currency"
import { XIcon } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { updateProduct } from "@/lib/features/product/productSlice"

function imageSrc(img) {
    if (!img) return '/favicon.ico'
    return typeof img === 'string' ? img : img?.src || '/favicon.ico'
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

    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 15
    const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE))
    const paginatedProducts = products.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    )

    useEffect(() => { setCurrentPage(1) }, [products.length])

    const [loading, setLoading] = useState(true)
    const [editingProduct, setEditingProduct] = useState(null)
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        mrp: "",
        price: "",
        category: "",
        material: "",
    })
    const [editVariants, setEditVariants] = useState([])
    const [newVariantType, setNewVariantType] = useState("")
    const [newVariantOption, setNewVariantOption] = useState("")
    const [editingVariantId, setEditingVariantId] = useState(null)

    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 0)
        return () => clearTimeout(t)
    }, [])

    const toggleStock = async (productId) => {
        const product = products.find((p) => p.id === productId)
        if (!product) return
        dispatch(updateProduct({ id: productId, inStock: !product.inStock }))
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
            material: product.material ?? "",
        })
        setEditVariants(
            Array.isArray(product.variants)
                ? product.variants.map((v) => ({ ...v, id: v.id ?? Date.now() }))
                : [],
        )
        setNewVariantType("")
        setNewVariantOption("")
        setEditingVariantId(null)
    }

    const closeEditModal = () => {
        setEditingProduct(null)
        setEditForm({
            name: "",
            description: "",
            mrp: "",
            price: "",
            category: "",
            material: "",
        })
        setEditVariants([])
        setNewVariantType("")
        setNewVariantOption("")
        setEditingVariantId(null)
    }

    const addEditVariantType = () => {
        const t = newVariantType.trim()
        if (!t) return
        if (editVariants.some((v) => v.type.toLowerCase() === t.toLowerCase())) {
            toast.error("Variant type already exists")
            return
        }
        setEditVariants((prev) => [...prev, { id: Date.now(), type: t, options: [] }])
        setNewVariantType("")
        setEditingVariantId(null)
    }

    const removeEditVariantType = (id) => {
        setEditVariants((prev) => prev.filter((v) => v.id !== id))
    }

    const addEditOption = (variantId) => {
        const opt = newVariantOption.trim()
        if (!opt) return
        setEditVariants((prev) =>
            prev.map((v) =>
                v.id === variantId
                    ? v.options.includes(opt) ? v : { ...v, options: [...v.options, opt] }
                    : v,
            ),
        )
        setNewVariantOption("")
    }

    const removeEditOption = (variantId, opt) => {
        setEditVariants((prev) =>
            prev.map((v) =>
                v.id === variantId
                    ? { ...v, options: v.options.filter((o) => o !== opt) }
                    : v,
            ),
        )
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

        dispatch(
            updateProduct({
                id: editingProduct.id,
                name: trimmedName,
                description: trimmedDescription,
                category: trimmedCategory,
                mrp: parsedMrp,
                price: parsedPrice,
                material: editForm.material.trim(),
                variants: editVariants.filter((v) => v.options.length > 0),
                updatedAt: new Date().toISOString(),
            }),
        )

        toast.success("Product updated successfully.")
        closeEditModal()
    }

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">Manage <span className="text-slate-800 font-medium">Products</span></h1>
            {products.length === 0 ? (
                <p className="text-slate-600">No products for this store yet. Add products from the Add Product page.</p>
            ) : (
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
                    {paginatedProducts.map((product) => (
                        <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                    <Image width={40} height={40} className='p-1 shadow rounded cursor-pointer' src={imageSrc(product.images?.[0])} alt="" />
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
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

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

                            <div className="sm:col-span-2">
                                <label className="block mb-1.5 text-slate-600 font-medium">Material</label>
                                <input
                                    value={editForm.material}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, material: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5]"
                                    placeholder="e.g. Oak wood, cotton, ceramic"
                                />
                            </div>

                            {/* ── Variants ── */}
                            <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                <p className="text-slate-600 font-medium mb-1">Product Variants</p>
                                <p className="text-xs text-slate-400 mb-3">Add size, color or any other variant options.</p>

                                {editVariants.map((variant) => (
                                    <div key={variant.id} className="mb-3 border border-slate-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-700">{variant.type}</span>
                                            <button type="button" onClick={() => removeEditVariantType(variant.id)}
                                                className="text-xs text-rose-500 hover:text-rose-700">Remove</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {variant.options.map((opt) => (
                                                <span key={opt} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full">
                                                    {opt}
                                                    <button type="button" onClick={() => removeEditOption(variant.id, opt)}
                                                        className="text-slate-400 hover:text-slate-700 leading-none ml-0.5">×</button>
                                                </span>
                                            ))}
                                        </div>
                                        {editingVariantId === variant.id ? (
                                            <div className="flex gap-2">
                                                <input type="text" value={newVariantOption}
                                                    onChange={(e) => setNewVariantOption(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditOption(variant.id) } }}
                                                    placeholder="e.g. Large"
                                                    className="flex-1 p-1.5 px-3 text-sm border border-slate-200 rounded outline-slate-400" />
                                                <button type="button" onClick={() => addEditOption(variant.id)}
                                                    className="text-sm bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-slate-900 transition">Add</button>
                                                <button type="button" onClick={() => { setEditingVariantId(null); setNewVariantOption("") }}
                                                    className="text-sm border border-slate-200 text-slate-500 px-3 py-1.5 rounded hover:bg-slate-50 transition">Done</button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => { setEditingVariantId(variant.id); setNewVariantOption("") }}
                                                className="text-xs text-[#2582eb] hover:underline">+ Add option</button>
                                        )}
                                    </div>
                                ))}

                                <div className="flex gap-2 mt-2">
                                    <input type="text" value={newVariantType}
                                        onChange={(e) => setNewVariantType(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditVariantType() } }}
                                        placeholder="Variant type (e.g. Size, Color)"
                                        className="flex-1 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400" />
                                    <button type="button" onClick={addEditVariantType}
                                        className="text-sm bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-900 transition">+ Add</button>
                                </div>
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
