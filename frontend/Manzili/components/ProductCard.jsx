'use client'
import { StarIcon } from 'lucide-react'
import { Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { getCurrencySymbol } from '@/lib/currency'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlistRemote } from '@/lib/features/wishlist/wishlistSlice'
import { useTranslate } from '@/lib/i18n/LocaleContext'

const ProductCard = ({ product }) => {
    const t = useTranslate();
    const currency = getCurrencySymbol()
    const dispatch = useDispatch()
    const inWishlist = useSelector(state => Boolean(state.wishlist.wishlistItems[product.id]))

    // calculate the average rating of the product
    const ratingList = Array.isArray(product.rating) ? product.rating : [];
    const rating = (ratingList.length > 0)
        ? Math.round(ratingList.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratingList.length)
        : 0;
    const thumbnail = (Array.isArray(product.images) ? product.images : [])[0] || null;

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='relative bg-[#F5F5F5] aspect-square w-full sm:w-60 sm:aspect-auto sm:h-68 rounded-lg flex items-center justify-center overflow-hidden'>
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        dispatch(toggleWishlistRemote(product.id))
                    }}
                    className='absolute top-2 left-2 p-1.5 rounded-full border border-slate-300 bg-white'
                    aria-label={t('productCard.toggleWishlist')}
                >
                    <Star size={14} className={inWishlist ? 'text-[#2582eb] fill-[#2582eb]' : 'text-slate-500'} />
                </button>
                {thumbnail && <Image width={500} height={500} className='max-w-full max-h-full sm:max-h-40 sm:w-auto object-contain group-hover:scale-110 transition duration-300' src={thumbnail} alt="" suppressHydrationWarning />}
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <div>
                    <p>{product.name}</p>
                    <div className='flex'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={rating >= index + 1 ? "#2582eb" : "#D1D5DB"} />
                        ))}
                    </div>
                </div>
                <p>{currency}{product.price}</p>
            </div>
            <div className="mt-1">
                {product.stock <= 0 && !(product.variants || []).some((v) => v.stock > 0) && (
                    <span className="text-xs text-rose-500 font-medium">{t('productCard.outOfStock')}</span>
                )}
            </div>
        </Link>
    )
}

export default ProductCard
