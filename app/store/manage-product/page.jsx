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
    const ITEMS_PER_PAGE = 10
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
    const [editVariantGroups, setEditVariantGroups] = useState([]) // [{id, type, options: [{id, name, swatch, price, mrp, stock, images}]}]
    const [editShowGroupForm, setEditShowGroupForm] = useState(false)
    const [editNewGroupType, setEditNewGroupType] = useState("")
    const [editActiveGroupId, setEditActiveGroupId] = useState(null)
    const [editNewOptionForm, setEditNewOptionForm] = useState({
        name: "", swatch: "#cccccc", price: "", mrp: "", stock: "", image: null,
    })

    const isColorType = (t) => /color/i.test(t)

    const resetEditOptionForm = () => {
        setEditNewOptionForm({ name: "", swatch: "#cccccc", price: "", mrp: "", stock: "", image: null })
        setEditActiveGroupId(null)
    }

    const addEditGroup = () => {
        const type = editNewGroupType.trim()
        if (!type) { toast.error("Variant group type is required"); return }
        if (editVariantGroups.some((g) => g.type.toLowerCase() === type.toLowerCase())) {
            toast.error("A group with this type already exists"); return
        }
        setEditVariantGroups((prev) => [...prev, { id: Date.now(), type, options: [] }])
        setEditNewGroupType("")
        setEditShowGroupForm(false)
    }

    const removeEditGroup = (id) => {
        setEditVariantGroups((prev) => prev.filter((g) => g.id !== id))
        if (editActiveGroupId === id) resetEditOptionForm()
    }

    const addEditOption = (groupId) => {
        const name = editNewOptionForm.name.trim()
        if (!name) { toast.error("Option name is required"); return }
        const group = editVariantGroups.find((g) => g.id === groupId)
        if (group && group.options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
            toast.error("Option already exists in this group"); return
        }
        if (!editNewOptionForm.stock && editNewOptionForm.stock !== 0) {
            toast.error("Stock quantity is required"); return
        }
        setEditVariantGroups((prev) =>
            prev.map((g) =>
                g.id === groupId
                    ? {
                        ...g,
                        options: [
                            ...g.options,
                            {
                                id: Date.now() + Math.random(),
                                name,
                                swatch: isColorType(g.type) ? editNewOptionForm.swatch : "",
                                price: Number(editNewOptionForm.price) || 0,
                                mrp: Number(editNewOptionForm.mrp) || 0,
                                stock: Number(editNewOptionForm.stock) || 0,
                                images: editNewOptionForm.image ? [editNewOptionForm.image] : [],
                            },
                        ],
                    }
                    : g,
            ),
        )
        resetEditOptionForm()
    }

    const removeEditOption = (groupId, optionId) => {
        setEditVariantGroups((prev) =>
            prev.map((g) =>
                g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g,
            ),
        )
    }

    const updateEditOptionForm = (field, value) => setEditNewOptionForm((prev) => ({ ...prev, [field]: value }))

    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 0)
        return () => clearTimeout(t)
    }, [])

    const toggleStock = async (productId) => {
        const product = products.find((p) => p.id === productId)
        if (!product) return
        dispatch(updateProduct({ id: productId, stock: product.stock > 0 ? 0 : 10 }))
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
        // Group existing flat variants by type
        const vars = Array.isArray(product.variants) ? product.variants : []
        const groups = {}
        vars.forEach((v) => {
            if (!groups[v.type]) groups[v.type] = []
            groups[v.type].push({ ...v, id: v.id ?? Date.now() + Math.random() })
        })
        setEditVariantGroups(
            Object.entries(groups).map(([type, opts]) => ({
                id: Date.now() + Math.random(),
                type,
                options: opts,
            })),
        )
        resetEditOptionForm()
    }

    const closeEditModal = () => {
        setEditingProduct(null)
        setEditForm({ name: "", description: "", mrp: "", price: "", category: "", material: "" })
        setEditVariantGroups([])
        setEditShowGroupForm(false)
        setEditNewGroupType("")
        resetEditOptionForm()
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
                variants: editVariantGroups.flatMap((g) =>
                    g.options.map((v) => ({
                        name: v.name,
                        type: g.type,
                        swatch: v.swatch || null,
                        price: v.price,
                        mrp: v.mrp,
                        stock: v.stock ?? 0,
                        images: Array.isArray(v.images) ? v.images : [],
                    })),
                ),
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
                                    <input type="checkbox" className="sr-only peer" onChange={() => toast.promise(toggleStock(product.id), { loading: "Updating data..." })} checked={product.stock > 0} />
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
                                <p className="text-xs text-slate-400 mb-3">Each variant has its own price, stock and image.</p>

                                {/* Existing groups */}
                                {editVariantGroups.map((group) => (
                                    <div key={group.id} className="mb-4 border border-slate-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-slate-700">{group.type}</p>
                                            <button type="button" onClick={() => removeEditGroup(group.id)}
                                                className="text-xs text-rose-500 hover:text-rose-700">Remove Group</button>
                                        </div>

                                        {group.options.length === 0 && (
                                            <p className="text-xs text-slate-400 mb-2">No options yet.</p>
                                        )}
                                        <div className="space-y-2">
                                            {group.options.map((opt) => (
                                                <div key={opt.id} className="flex items-center gap-2 text-sm bg-slate-50 rounded px-2 py-1.5">
                                                    {isColorType(group.type) && opt.swatch && (
                                                        <span className="inline-block w-4 h-4 rounded-full border border-slate-300 shrink-0"
                                                            style={{ backgroundColor: opt.swatch }} />
                                                    )}
                                                    <span className="font-medium text-slate-700 min-w-0">{opt.name}</span>
                                                    <span className="text-xs text-slate-400 ml-auto">{currency}{opt.price || 0}</span>
                                                    <span className="text-xs text-slate-400">Stock: {opt.stock ?? 0}</span>
                                                    <button type="button" onClick={() => removeEditOption(group.id, opt.id)}
                                                        className="text-xs text-rose-400 hover:text-rose-600 ml-1">✕</button>
                                                </div>
                                            ))}
                                        </div>

                                        {editActiveGroupId === group.id ? (
                                            <div className="mt-3 border-t border-slate-100 pt-3">
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                                    <input type="text" value={editNewOptionForm.name}
                                                        onChange={(e) => updateEditOptionForm("name", e.target.value)}
                                                        placeholder="Name (e.g. Red)" className="col-span-2 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400" />
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">Price</label>
                                                        <input type="number" value={editNewOptionForm.price}
                                                            onChange={(e) => updateEditOptionForm("price", e.target.value)}
                                                            placeholder="0" className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">MRP</label>
                                                        <input type="number" value={editNewOptionForm.mrp}
                                                            onChange={(e) => updateEditOptionForm("mrp", e.target.value)}
                                                            placeholder="0" className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-400 block mb-1">Stock *</label>
                                                        <input type="number" value={editNewOptionForm.stock}
                                                            onChange={(e) => updateEditOptionForm("stock", e.target.value)}
                                                            placeholder="0" required min={0}
                                                            className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400" />
                                                    </div>
                                                    <div>
                                                        {isColorType(group.type) && (
                                                            <label className="flex items-center gap-2 text-xs text-slate-500">
                                                                <span>Swatch:</span>
                                                                <input type="color" value={editNewOptionForm.swatch}
                                                                    onChange={(e) => updateEditOptionForm("swatch", e.target.value)}
                                                                    className="w-8 h-8 p-0.5 border border-slate-300 rounded cursor-pointer" />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <label className="text-xs text-slate-400 block mb-1">Image (optional)</label>
                                                    <label className="inline-flex items-center gap-2 text-xs text-[#2582eb] cursor-pointer hover:underline">
                                                        <input type="file" accept="image/*"
                                                            onChange={(e) => updateEditOptionForm("image", e.target.files?.[0] || null)}
                                                            className="hidden" />
                                                        {editNewOptionForm.image ? editNewOptionForm.image.name : "Upload image"}
                                                    </label>
                                                    {editNewOptionForm.image && (
                                                        <Image width={60} height={60} className="h-15 w-auto mt-2 rounded border border-slate-200"
                                                            src={URL.createObjectURL(editNewOptionForm.image)} alt="" />
                                                    )}
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <button type="button" onClick={() => addEditOption(group.id)}
                                                        className="text-sm bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-900 transition">Add</button>
                                                    <button type="button" onClick={() => { resetEditOptionForm() }}
                                                        className="text-sm border border-slate-200 text-slate-500 px-4 py-2 rounded hover:bg-slate-50 transition">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => { resetEditOptionForm(); setEditActiveGroupId(group.id) }}
                                                className="mt-2 text-sm text-[#2582eb] hover:underline">+ Add option</button>
                                        )}
                                    </div>
                                ))}

                                {/* Add group form */}
                                {editShowGroupForm ? (
                                    <div className="border border-slate-200 rounded-lg p-3 mb-3">
                                        <p className="text-sm font-medium text-slate-700 mb-3">New Variant Group</p>
                                        <div className="flex gap-2 mb-3">
                                            <select value={editNewGroupType} onChange={(e) => setEditNewGroupType(e.target.value)}
                                                className="flex-1 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400 bg-white">
                                                <option value="">Select type…</option>
                                                <option value="Color">Color</option>
                                                <option value="Size">Size</option>
                                                <option value="Material">Material</option>
                                                <option value="Style">Style</option>
                                                <option value="Flavor">Flavor</option>
                                            </select>
                                            <input type="text" value={editNewGroupType} onChange={(e) => setEditNewGroupType(e.target.value)}
                                                placeholder="Or type custom…" className="flex-1 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={addEditGroup}
                                                className="text-sm bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-900 transition">Create Group</button>
                                            <button type="button" onClick={() => { setEditShowGroupForm(false); setEditNewGroupType("") }}
                                                className="text-sm border border-slate-200 text-slate-500 px-4 py-2 rounded hover:bg-slate-50 transition">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setEditShowGroupForm(true)}
                                        className="text-sm text-[#2582eb] hover:underline">+ Add Variant Group</button>
                                )}
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
