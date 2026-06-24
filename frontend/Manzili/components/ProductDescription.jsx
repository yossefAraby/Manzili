'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { fetchRatings } from "@/lib/api/ratings"
import { useTranslate } from '@/lib/i18n/LocaleContext'

const ProductDescription = ({ product }) => {

    const t = useTranslate();

    const SHIPPING_SIZE_LABELS = {
        SMALL: t('productDescription.smallPackage'),
        MEDIUM: t('productDescription.mediumPackage'),
        LARGE: t('productDescription.largePackage'),
    }

    const [selectedTab, setSelectedTab] = useState('Description')
    const [apiRatings, setApiRatings] = useState([])

    // Fetch ratings for this product from the .NET API (fail-safe → []).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const ratings = await fetchRatings(product.id);
                if (!cancelled) setApiRatings(Array.isArray(ratings) ? ratings : []);
            } catch {
                // Silently ignore — the static product.rating list still renders.
                if (!cancelled) setApiRatings([]);
            }
        })();
        return () => { cancelled = true; };
    }, [product.id]);

    // Merge API ratings with any ratings shipped on the product detail, DE-DUPED by id. Both
    // sources are the same DB table and use the same stable id ({enduser}_{product}), so without
    // this the buyer's own review renders twice (once from each source).
    const allRatings = (() => {
        const merged = [...(apiRatings || []), ...(Array.isArray(product.rating) ? product.rating : [])];
        const seen = new Set();
        return merged.filter((r) => {
            const k = r?.id || `${r?.user?.name}|${r?.createdAt}|${r?.review}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    })();

    const material = String(product.material || '').trim()
    const sizeLabel = SHIPPING_SIZE_LABELS[product.shippingSize] || ''
    const hasMaterialOrSize = Boolean(material || sizeLabel)

    return (
        <div className="my-18 text-sm text-slate-600">

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 max-w-2xl">
                {['Description', 'Reviews'].map((tab, index) => (
                    <button className={`${tab === selectedTab ? 'border-b-[1.5px] font-semibold' : 'text-slate-400'} px-3 py-2 font-medium`} key={index} onClick={() => setSelectedTab(tab)}>
                        {tab === 'Description' ? t('productDescription.description') : t('productDescription.reviews')}
                    </button>
                ))}
            </div>

            {/* Description */}
            {selectedTab === "Description" && (
                <div className="max-w-xl">
                    <p>{product.description}</p>
                    {hasMaterialOrSize && (
                        <div className="mt-5 border-t border-slate-100 pt-4">
                            <p className="font-semibold text-slate-700 mb-2">{t('productDescription.materialAndSize')}</p>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-slate-600">
                                {material && (
                                    <>
                                        <dt className="text-slate-400">{t('productDescription.material')}</dt>
                                        <dd>{material}</dd>
                                    </>
                                )}
                                {sizeLabel && (
                                    <>
                                        <dt className="text-slate-400">{t('productDescription.size')}</dt>
                                        <dd>{sizeLabel}</dd>
                                    </>
                                )}
                            </dl>
                        </div>
                    )}
                </div>
            )}

            {/* Reviews */}
            {selectedTab === "Reviews" && (
                <div className="flex flex-col gap-3 mt-14">
                    {allRatings.length > 0 ? allRatings.map((item, index) => (
                        <div key={item.id || index} className="flex gap-5 mb-10">
                            {item.user?.image && <Image src={item.user.image} alt="" className="size-10 rounded-full" width={100} height={100} />}
                            <div>
                                <div className="flex items-center" >
                                    {Array(5).fill('').map((_, i) => (
                                        <StarIcon key={i} size={18} className='text-transparent mt-0.5' fill={item.rating >= i + 1 ? "#2582eb" : "#D1D5DB"} />
                                    ))}
                                </div>
                                <p className="text-sm max-w-lg my-4">{item.review}</p>
                                <p className="font-medium text-slate-800">{item.user?.name}</p>
                                <p className="mt-3 font-light">{new Date(item.createdAt).toDateString()}</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-slate-400">{t('productDescription.noReviewsYet')}</p>
                    )}
                </div>
            )}

            {/* Store Page */}
            {product.store ? (
                <div className="flex gap-3 mt-14">
                    {product.store.logo ? (
                        <Image src={product.store.logo} alt="" className="size-11 rounded-full ring ring-slate-400" width={100} height={100} />
                    ) : (
                        <div className="size-11 rounded-full ring ring-slate-400 bg-slate-200 grid place-items-center text-slate-500 font-semibold">
                            {(product.store.name || '?').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-slate-600">{t('productDescription.productBy', { store: product.store.name })}</p>
                        <Link href={`/shop/${product.store.username || product.store.id}`} className="flex items-center gap-1.5 text-[#2582eb]"> {t('productDescription.viewStore')} <ArrowRight size={14} /></Link>
                    </div>
                </div>
            ) : (
                <div className="flex gap-3 mt-14">
                    <p className="text-slate-400 text-sm">{t('productDescription.storeInfoUnavailable')}</p>
                </div>
            )}
        </div>
    )
}

export default ProductDescription
