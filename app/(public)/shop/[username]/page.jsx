'use client'
import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { MailIcon, MapPinIcon } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import { readStoresList } from "@/lib/services/localStoreRegistry"
import { useSelector } from "react-redux"

export default function StoreShop() {

    const { username } = useParams()
    const productList = useSelector((s) => s.product.list)
    const [products, setProducts] = useState([])
    const [storeInfo, setStoreInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    const slug = useMemo(() => String(username || "").toLowerCase(), [username])

    useEffect(() => {
        const stores = readStoresList()
        const store = stores.find((s) => String(s.username || "").toLowerCase() === slug)
        if (!store) {
            setStoreInfo(null)
            setProducts([])
            setLoading(false)
            return
        }
        setStoreInfo(store)
        setProducts(productList.filter((p) => p.storeId === store.id))
        setLoading(false)
    }, [slug, productList])

    return !loading ? (
        <div className="min-h-[70vh] mx-6">

            {/* Store Info Banner */}
            {!storeInfo ? (
                <div className="max-w-7xl mx-auto mt-12 text-center text-slate-500 py-20">
                    <p className="text-lg">No store found at this address.</p>
                    <p className="text-sm mt-2">Check the link or browse the marketplace.</p>
                </div>
            ) : (
                <>
                <div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs">
                    <Image
                        src={storeInfo.logo}
                        alt={storeInfo.name}
                        className="size-32 sm:size-38 object-cover border-2 border-slate-100 rounded-md"
                        width={200}
                        height={200}
                    />
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-semibold text-slate-800">{storeInfo.name}</h1>
                        <p className="text-sm text-slate-600 mt-2 max-w-lg">{storeInfo.description}</p>
                        <div className="text-xs text-slate-500 mt-4 space-y-1"></div>
                        <div className="space-y-2 text-sm text-slate-500">
                            <div className="flex items-center">
                                <MapPinIcon className="w-4 h-4 text-gray-500 mr-2" />
                                <span>{storeInfo.address}</span>
                            </div>
                            <div className="flex items-center">
                                <MailIcon className="w-4 h-4 text-gray-500 mr-2" />
                                <span>{storeInfo.email}</span>
                            </div>
                           
                        </div>
                    </div>
                </div>

            <div className=" max-w-7xl mx-auto mb-40">
                <h1 className="text-2xl mt-12">Shop <span className="text-slate-800 font-medium">Products</span></h1>
                <div className="mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto">
                    {products.length === 0 ? (
                        <p className="text-slate-500 text-sm">No products listed yet.</p>
                    ) : (
                        products.map((product) => <ProductCard key={product.id} product={product} />)
                    )}
                </div>
            </div>
                </>
            )}
        </div>
    ) : <Loading />
}