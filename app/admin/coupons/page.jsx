'use client'
import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { DeleteIcon } from "lucide-react"
import { productDummyData, storesDummyData } from "@/assets/assets"
import { COUPON_SCOPES, getCouponTargetLabel, normalizeCouponCode } from "@/lib/couponUtils"
import { createCoupon, listCoupons, removeCoupon } from "@/lib/services/localCouponService"

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([])
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        description: '',
        discount: '',
        scope: COUPON_SCOPES.GLOBAL,
        storeId: '',
        productIds: [],
        maxUsers: '',
        expiresAt: format(new Date(), 'yyyy-MM-dd')
    })

    const fetchCoupons = async () => {
        const list = await listCoupons();
        setCoupons(list)
    }

    const handleAddCoupon = async (e) => {
        e.preventDefault()
        const code = normalizeCouponCode(newCoupon.code)

        if (coupons.some((coupon) => coupon.code === code)) {
            toast.error("Coupon code already exists")
            return
        }

        if (newCoupon.scope !== COUPON_SCOPES.GLOBAL && !newCoupon.storeId) {
            toast.error("Please select a store")
            return
        }

        if (newCoupon.scope === COUPON_SCOPES.PRODUCTS && newCoupon.productIds.length === 0) {
            toast.error("Please select at least one product")
            return
        }

        const createdCoupon = {
            code,
            description: newCoupon.description,
            discount: Number(newCoupon.discount),
            scope: newCoupon.scope,
            storeId: newCoupon.scope === COUPON_SCOPES.GLOBAL ? null : newCoupon.storeId,
            productIds: newCoupon.scope === COUPON_SCOPES.PRODUCTS ? newCoupon.productIds : [],
            createdBy: "ADMIN",
            expiresAt: new Date(newCoupon.expiresAt).toISOString(),
            maxUsers: Number(newCoupon.maxUsers),
            usedCount: 0,
            createdAt: new Date().toISOString(),
        }

        await createCoupon(createdCoupon)
        setCoupons((prev) => [createdCoupon, ...prev])
        setNewCoupon({
            code: '',
            description: '',
            discount: '',
            scope: COUPON_SCOPES.GLOBAL,
            storeId: '',
            productIds: [],
            maxUsers: '',
            expiresAt: format(new Date(), 'yyyy-MM-dd')
        })
        toast.success("Coupon added")
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setNewCoupon({ ...newCoupon, [name]: value })
    }

    const deleteCoupon = async (code) => {
        const nextCoupons = await removeCoupon(code)
        setCoupons(nextCoupons)
        toast.success("Coupon deleted")
    }

    useEffect(() => {
        fetchCoupons();
    }, [])

    return (
        <div className="text-slate-500 mb-40">
            <form onSubmit={(e) => toast.promise(handleAddCoupon(e), { loading: "Adding coupon..." })} className="max-w-sm text-sm">
                <h2 className="text-2xl">Add <span className="text-slate-800 font-medium">Coupons</span></h2>
                <div className="flex gap-2 max-sm:flex-col mt-2">
                    <input type="text" placeholder="Coupon Code" className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="code" value={newCoupon.code} onChange={handleChange} required
                    />
                    <input type="number" placeholder="Coupon Discount (%)" min={1} max={100} className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="discount" value={newCoupon.discount} onChange={handleChange} required
                    />
                </div>
                <input type="text" placeholder="Coupon Description" className="w-full mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                    name="description" value={newCoupon.description} onChange={handleChange} required
                />

                <div className="flex gap-2 max-sm:flex-col mt-2">
                    <label className="w-full">
                        <p className="mb-1">Coupon Scope</p>
                        <select className="w-full p-2 border border-slate-200 outline-slate-400 rounded-md" name="scope" value={newCoupon.scope} onChange={handleChange}>
                            <option value={COUPON_SCOPES.GLOBAL}>Global</option>
                            <option value={COUPON_SCOPES.STORE}>Store</option>
                            <option value={COUPON_SCOPES.PRODUCTS}>Products</option>
                        </select>
                    </label>
                    <input type="number" placeholder="Max users" min={1} className="w-full mt-6 max-sm:mt-2 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="maxUsers" value={newCoupon.maxUsers} onChange={handleChange} required
                    />
                </div>

                {newCoupon.scope !== COUPON_SCOPES.GLOBAL && (
                    <label>
                        <p className="mt-3">Target Store</p>
                        <select className="w-full mt-1 p-2 border border-slate-200 outline-slate-400 rounded-md" name="storeId" value={newCoupon.storeId} onChange={(e) => setNewCoupon({ ...newCoupon, storeId: e.target.value, productIds: [] })} required>
                            <option value="">Select store</option>
                            {storesDummyData.map((store) => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </label>
                )}

                {newCoupon.scope === COUPON_SCOPES.PRODUCTS && (
                    <label>
                        <p className="mt-3">Target Products</p>
                        <select className="w-full mt-1 p-2 border border-slate-200 outline-slate-400 rounded-md min-h-32" multiple value={newCoupon.productIds} onChange={(e) => {
                            const selectedValues = Array.from(e.target.selectedOptions, (option) => option.value)
                            setNewCoupon({ ...newCoupon, productIds: selectedValues })
                        }}>
                            {productDummyData.filter((product) => product.storeId === newCoupon.storeId).map((product) => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                        </select>
                    </label>
                )}

                <label>
                    <p className="mt-3">Coupon Expiry Date</p>
                    <input type="date" placeholder="Coupon Expires At" className="w-full mt-1 p-2 border border-slate-200 outline-slate-400 rounded-md"
                        name="expiresAt" value={newCoupon.expiresAt} onChange={handleChange} required
                    />
                </label>
                <button className="mt-4 p-2 px-10 rounded bg-slate-700 text-white active:scale-95 transition">Add Coupon</button>
            </form>

            <div className="mt-14">
                <h2 className="text-2xl">List <span className="text-slate-800 font-medium">Coupons</span></h2>
                <div className="overflow-x-auto mt-4 rounded-lg border border-slate-200 max-w-5xl">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Code</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Description</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Discount</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Scope</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Target</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Expires At</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Max Users</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Used</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {coupons.map((coupon) => (
                                <tr key={coupon.code} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 font-medium text-slate-800">{coupon.code}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.description}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.discount}%</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.scope}</td>
                                    <td className="py-3 px-4 text-slate-800">{getCouponTargetLabel(coupon)}</td>
                                    <td className="py-3 px-4 text-slate-800">{format(coupon.expiresAt, 'yyyy-MM-dd')}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.maxUsers}</td>
                                    <td className="py-3 px-4 text-slate-800">{coupon.usedCount || 0}</td>
                                    <td className="py-3 px-4 text-slate-800">
                                        <DeleteIcon onClick={() => toast.promise(deleteCoupon(coupon.code), { loading: "Deleting coupon..." })} className="w-5 h-5 text-red-500 hover:text-red-800 cursor-pointer" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}