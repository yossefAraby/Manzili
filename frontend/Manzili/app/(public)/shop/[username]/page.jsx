'use client'
import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { MailIcon, MapPinIcon, StarIcon } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import { fetchStoreByUsername, fetchStoreProducts, fetchStoreCustomWork } from "@/lib/api/store"
import { useTranslate } from '@/lib/i18n/LocaleContext'

// Custom-request images can be oversized base64 data: URLs (the backend already nulls those out),
// but guard the UI too so we never try to render one.
function isDataUrl(src) {
  return typeof src === "string" && src.startsWith("data:")
}

export default function StoreShop() {

    const t = useTranslate()
    const { username } = useParams()
    const [products, setProducts] = useState([])
    const [storeInfo, setStoreInfo] = useState(null)
    const [customWork, setCustomWork] = useState([])
    const [loading, setLoading] = useState(true)

    const slug = useMemo(() => String(username || "").toLowerCase(), [username])

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Resolve username -> store via the API, then load its products.
                const store = await fetchStoreByUsername(slug)
                if (cancelled) return
                if (!store) {
                    setStoreInfo(null)
                    setProducts([])
                    setCustomWork([])
                    return
                }
                setStoreInfo(store)
                // Products + completed custom work load together; custom work is fail-safe ([]) so
                // it just hides the section when there's none.
                const [{ items }, work] = await Promise.all([
                    fetchStoreProducts(store.id),
                    fetchStoreCustomWork(store.id),
                ])
                if (!cancelled) {
                    setProducts(Array.isArray(items) ? items : [])
                    setCustomWork(Array.isArray(work) ? work : [])
                }
            } catch {
                if (!cancelled) { setStoreInfo(null); setProducts([]); setCustomWork([]) }
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true; }
    }, [slug])

    return !loading ? (
        <div className="min-h-[70vh] mx-6">

            {/* Store Info Banner */}
            {!storeInfo ? (
                <div className="max-w-7xl mx-auto mt-12 text-center text-slate-500 py-20">
                    <p className="text-lg">{t('store.storeNotFound')}</p>
                </div>
            ) : (
                <>
                <div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs">
                    {storeInfo.logo && (
                        <Image
                            src={storeInfo.logo}
                            alt={storeInfo.name}
                            className="size-32 sm:size-38 object-cover border-2 border-slate-100 rounded-md"
                            width={200}
                            height={200}
                        />
                    )}
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
                <h1 className="text-2xl mt-12">{t('shop.title')}</h1>
                <div className="mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto">
                    {products.length === 0 ? (
                        <p className="text-slate-500 text-sm">{t('shop.noProducts')}</p>
                    ) : (
                        products.map((product) => <ProductCard key={product.id} product={product} />)
                    )}
                </div>

                {/* Custom Work — delivered + reviewed bespoke pieces. Hidden when empty. */}
                {customWork.length > 0 && (
                    <div className="mt-16">
                        <h1 className="text-2xl">Custom Work</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Completed bespoke pieces made for buyers through custom requests.
                        </p>
                        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {customWork.map((work) => (
                                <CustomWorkCard key={work.id} work={work} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
                </>
            )}
        </div>
    ) : <Loading />
}

/** A single completed custom piece: image + title + the buyer's star rating/snippet. */
function CustomWorkCard({ work }) {
    const img = work.image && !isDataUrl(work.image) ? work.image : "/placeholder.png"
    const rating = Math.round(Number(work.rating) || 0)
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="aspect-square bg-slate-50 relative">
                <Image
                    src={img}
                    alt={work.productName}
                    fill
                    className="object-cover"
                    unoptimized={isDataUrl(img)}
                    sizes="(max-width: 640px) 50vw, 25vw"
                />
            </div>
            <div className="p-3">
                <p className="text-sm font-medium text-slate-700 line-clamp-1">{work.productName}</p>
                {rating > 0 && (
                    <div className="flex items-center gap-0.5 mt-1" aria-label={`${rating} out of 5`}>
                        {Array.from({ length: 5 }, (_, i) => (
                            <StarIcon
                                key={i}
                                size={13}
                                className={i < rating ? "text-[#e67e22] fill-current" : "text-slate-300"}
                            />
                        ))}
                    </div>
                )}
                {work.reviewText && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">“{work.reviewText}”</p>
                )}
            </div>
        </div>
    )
}
