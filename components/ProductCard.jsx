'use client'
import { StarIcon } from 'lucide-react'
import { Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { getCurrencySymbol } from '@/lib/currency'
import { useDispatch, useSelector } from 'react-redux'
import { toggleWishlist } from '@/lib/features/wishlist/wishlistSlice'

const ProductCard = ({ product }) => {

    const currency = getCurrencySymbol()
    const dispatch = useDispatch()
    const inWishlist = useSelector(state => Boolean(state.wishlist.wishlistItems[product.id]))

    // calculate the average rating of the product
    const rating = Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / product.rating.length);

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='relative bg-[#F5F5F5] h-40  sm:w-60 sm:h-68 rounded-lg flex items-center justify-center'>
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        dispatch(toggleWishlist({ productId: product.id }))
                    }}
                    className='absolute top-2 left-2 p-1.5 rounded-full border border-slate-300 bg-white'
                    aria-label='Toggle wishlist'
                >
                    <Star size={14} className={inWishlist ? 'text-[#2582eb] fill-[#2582eb]' : 'text-slate-500'} />
                </button>
                <Image width={500} height={500} className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' src={product.images[0]} alt="" suppressHydrationWarning />
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
        </Link>
    )
}

export default ProductCard