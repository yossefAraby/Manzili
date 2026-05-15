'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { toggleWishlist } from "@/lib/features/wishlist/wishlistSlice";
import { SparklesIcon, StarIcon, TagIcon, WandSparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import { getCurrencySymbol } from "@/lib/currency";

/** sessionStorage key the customize CTA writes to; /custom-order reads + clears it. */
const CUSTOMIZE_SEED_KEY = "manzili_customize_seed_v1";

const ProductDetails = ({ product }) => {

    const productId = product.id;
    const currency = getCurrencySymbol();

    const cart = useSelector(state => state.cart.cartItems);
    const inWishlist = useSelector(state => Boolean(state.wishlist.wishlistItems[productId]));
    const dispatch = useDispatch();

    const router = useRouter()

    const [mainImage, setMainImage] = useState(product.images[0]);

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
    }

    const customizeThisItem = () => {
        // Stash a lightweight seed object — image data URLs can be large so we
        // only forward the URLs (the /custom-order page will fetch + convert
        // them to its expected {file, preview} shape itself).
        const seed = {
            productId: product.id,
            itemName: product.name,
            description: product.description,
            category: product.category,
            material: product.material || '',
            imageUrls: Array.isArray(product.images) ? product.images.slice(0, 5) : [],
            store: product.store
                ? {
                      id: product.store.id || product.storeId,
                      name: product.store.name,
                      username: product.store.username,
                      logo: product.store.logo,
                      description: product.store.description,
                  }
                : null,
        }
        try {
            sessionStorage.setItem(CUSTOMIZE_SEED_KEY, JSON.stringify(seed))
        } catch {
            /* ignore quota / private-mode failures — page will just render empty */
        }
        router.push(`/custom-order?customize=${encodeURIComponent(product.id)}`)
    }

    const averageRating = product.rating.reduce((acc, item) => acc + item.rating, 0) / product.rating.length;
    const listPrice = Number(product.mrp);
    const salePrice = Number(product.price);
    const hasListDiscount = listPrice > salePrice && listPrice > 0;
    const discountPercent = hasListDiscount
        ? Math.round(((listPrice - salePrice) / listPrice) * 100)
        : 0;
    
    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {product.images.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(product.images[index])} className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer">
                            <Image src={image} className="group-hover:scale-103 group-active:scale-95 transition" alt="" width={45} height={45} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg ">
                    <Image src={mainImage} alt="" width={250} height={250} />
                </div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#2582eb" : "#D1D5DB"} />
                    ))}
                    <p className="text-sm ml-3 text-slate-500">{product.rating.length} Reviews</p>
                </div>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p>
                        {currency}
                        {salePrice}
                    </p>
                    {hasListDiscount && (
                        <p className="text-xl text-slate-500 line-through">
                            {currency}
                            {listPrice}
                        </p>
                    )}
                </div>
                {discountPercent > 0 && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <TagIcon size={14} />
                        <p>Save {discountPercent}% right now</p>
                    </div>
                )}
                <div className="flex items-end gap-5 mt-10">
                    {
                        cart[productId] && (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">Quantity</p>
                                <Counter productId={productId} />
                            </div>
                        )
                    }
                    <button onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} className="bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition">
                        {!cart[productId] ? 'Add to Cart' : 'View Cart'}
                    </button>
                    <button
                        onClick={() => dispatch(toggleWishlist({ productId }))}
                        className="border border-slate-300 text-slate-700 px-6 py-3 text-sm font-medium rounded hover:bg-slate-50 transition"
                    >
                        {inWishlist ? 'Wishlisted' : 'Wishlist'}
                    </button>
                </div>

                {/* Customize-this-item CTA — sends the artisan a private request
                    seeded with this product so the buyer can ask for tweaks. */}
                <div className="mt-6 flex flex-col gap-2 max-w-md">
                    <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                        <SparklesIcon size={14} className="text-[#e67e22]" />
                        Love this but want a tweak? The maker can craft your version.
                    </p>
                    <button
                        type="button"
                        onClick={customizeThisItem}
                        className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-md overflow-hidden bg-gradient-to-r from-[#e67e22] via-[#d35400] to-[#b64b2b] hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        {/* Shimmer sweep */}
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-700" />
                        <WandSparklesIcon size={16} className="relative z-10" />
                        <span className="relative z-10">Customize this for me</span>
                    </button>
                </div>

                <hr className="border-gray-300 my-5" />
            </div>
        </div>
    )
}

export default ProductDetails