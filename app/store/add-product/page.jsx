'use client'

import { assets } from '@/assets/assets'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { addProduct } from '@/lib/features/product/productSlice'
import { makeEntityId } from '@/lib/storage/localStorageEnvelope'

export default function StoreAddProduct() {
    const dispatch = useDispatch()
    const session = useSelector((s) => s.auth.session)

    const categories = [
        'Woodwork',
        'Woodworking',
        'Accessories',
        'Stationery',
        'Food & Snacks',
        'fragrances',
        'Textiles',
        'Porcelain',
    ]

    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: '',
        description: '',
        mrp: 0,
        price: 0,
        category: '',
        shippingSize: 'MEDIUM',
        shippingBulkyCategory: 'NORMAL',
    })
    const [loading, setLoading] = useState(false)

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const fileToDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => resolve(r.result)
            r.onerror = reject
            r.readAsDataURL(file)
        })

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        if (!session?.storeId) {
            toast.error('Your account has no store linked. Create a store from the seller dashboard first.')
            return
        }
        setLoading(true)
        try {
            const imageUrls = []
            for (const key of Object.keys(images)) {
                const f = images[key]
                if (f) imageUrls.push(await fileToDataUrl(f))
            }
            const uploadFallback =
                typeof assets.upload_area === 'string' ? assets.upload_area : assets.upload_area?.src
            const primary = imageUrls[0] || uploadFallback || '/favicon.ico'

            const product = {
                id: makeEntityId('prod'),
                name: productInfo.name,
                description: productInfo.description,
                mrp: Number(productInfo.mrp) || 0,
                price: Number(productInfo.price) || 0,
                images: imageUrls.length ? imageUrls : [primary],
                category: productInfo.category,
                storeId: session.storeId,
                inStock: true,
                shippingSize: productInfo.shippingSize,
                shippingBulkyCategory: productInfo.shippingBulkyCategory,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            dispatch(addProduct(product))
            toast.success('Product added (saved in this browser)')
            setProductInfo({
                name: '',
                description: '',
                mrp: 0,
                price: 0,
                category: '',
                shippingSize: 'MEDIUM',
                shippingBulkyCategory: 'NORMAL',
            })
            setImages({ 1: null, 2: null, 3: null, 4: null })
        } catch (err) {
            toast.error(err?.message || 'Could not add product')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form
            onSubmit={(e) => toast.promise(onSubmitHandler(e), { loading: 'Adding product…' })}
            className="text-slate-500 mb-28"
        >
            <h1 className="text-2xl">
                Add New <span className="text-slate-800 font-medium">Product</span>
            </h1>
            <p className="mt-7">Product images</p>

            <div className="flex gap-3 mt-4">
                {Object.keys(images).map((key) => (
                    <label key={key} htmlFor={`images${key}`}>
                        <Image
                            width={300}
                            height={300}
                            className="h-15 w-auto border border-slate-200 rounded cursor-pointer"
                            src={
                                images[key]
                                    ? URL.createObjectURL(images[key])
                                    : typeof assets.upload_area === 'string'
                                      ? assets.upload_area
                                      : assets.upload_area?.src
                            }
                            alt=""
                        />
                        <input
                            type="file"
                            accept="image/*"
                            id={`images${key}`}
                            onChange={(e) => setImages({ ...images, [key]: e.target.files?.[0] || null })}
                            hidden
                        />
                    </label>
                ))}
            </div>

            <label className="flex flex-col gap-2 my-6 ">
                Name
                <input
                    type="text"
                    name="name"
                    onChange={onChangeHandler}
                    value={productInfo.name}
                    placeholder="Product name"
                    className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
                    required
                />
            </label>

            <label className="flex flex-col gap-2 my-6 ">
                Description
                <textarea
                    name="description"
                    onChange={onChangeHandler}
                    value={productInfo.description}
                    placeholder="Description"
                    rows={5}
                    className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none"
                    required
                />
            </label>

            <div className="flex gap-5 flex-wrap">
                <label className="flex flex-col gap-2 ">
                    List price (EGP)
                    <input
                        type="number"
                        name="mrp"
                        onChange={onChangeHandler}
                        value={productInfo.mrp}
                        placeholder="0"
                        className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
                        required
                        min={0}
                        step="0.01"
                    />
                </label>
                <label className="flex flex-col gap-2 ">
                    Offer price (EGP)
                    <input
                        type="number"
                        name="price"
                        onChange={onChangeHandler}
                        value={productInfo.price}
                        placeholder="0"
                        className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
                        required
                        min={0}
                        step="0.01"
                    />
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl my-6">
                <label className="flex flex-col gap-2 text-sm">
                    Package size (internal)
                    <select
                        name="shippingSize"
                        value={productInfo.shippingSize}
                        onChange={onChangeHandler}
                        className="p-2 border border-slate-200 rounded"
                    >
                        <option value="SMALL">Small</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LARGE">Large</option>
                    </select>
                    <span className="text-xs text-slate-400">Maps to Bosta via BOSTA_SIZE_MAP_* env vars.</span>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                    Bulky / type profile
                    <select
                        name="shippingBulkyCategory"
                        value={productInfo.shippingBulkyCategory}
                        onChange={onChangeHandler}
                        className="p-2 border border-slate-200 rounded"
                    >
                        <option value="NORMAL">Normal</option>
                        <option value="LIGHT_BULKY">Light bulky</option>
                        <option value="HEAVY_BULKY">Heavy bulky</option>
                    </select>
                    <span className="text-xs text-slate-400">Maps to Bosta package type via BOSTA_BULKY_MAP_*.</span>
                </label>
            </div>

            <select
                onChange={(e) => setProductInfo({ ...productInfo, category: e.target.value })}
                value={productInfo.category}
                className="w-full max-w-sm p-2 px-4 my-2 outline-none border border-slate-200 rounded"
                required
            >
                <option value="">Select a category</option>
                {categories.map((category) => (
                    <option key={category} value={category}>
                        {category}
                    </option>
                ))}
            </select>

            <br />

            <button
                type="submit"
                disabled={loading}
                className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition disabled:opacity-60"
            >
                Add product
            </button>
        </form>
    )
}
