'use client'
import { CalendarIcon, ImageIcon, StoreIcon, UserIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const CustomRequestCard = ({ request }) => {
    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'No date'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    // Get category color
    const getCategoryColor = (category) => {
        const colors = {
            'Woodwork': 'bg-amber-100 text-amber-800',
            'Accessories': 'bg-purple-100 text-purple-800',
            'Stationery': 'bg-blue-100 text-blue-800',
            'Food & Snacks': 'bg-red-100 text-red-800',
            'Fragrances': 'bg-pink-100 text-pink-800',
            'Textiles': 'bg-green-100 text-green-800',
            'Porcelain': 'bg-cyan-100 text-cyan-800',
        }
        return colors[category] || 'bg-slate-100 text-slate-800'
    }

    return (
        <Link href={`/custom-request/${request.id}`} className='group max-xl:mx-auto'>
            <div className='bg-[#F5F5F5] h-40 sm:w-60 sm:h-68 rounded-lg flex items-center justify-center relative'>
                {request.images && request.images.length > 0 ? (
                    <Image 
                        width={500} 
                        height={500} 
                        className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' 
                        src={request.images[0]} 
                        alt={request.itemName} 
                        suppressHydrationWarning 
                    />
                ) : (
                    <div className='flex flex-col items-center text-slate-400'>
                        <ImageIcon size={48} />
                        <p className='mt-2 text-sm'>No images</p>
                    </div>
                )}
                <div className='absolute top-2 right-2'>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${request.visibility === 'private' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {request.visibility === 'private' ? 'Private' : 'Open'}
                    </span>
                </div>
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <div className='flex-1'>
                    <p className='font-medium line-clamp-1'>{request.itemName}</p>
                    <div className='flex items-center gap-2 mt-1'>
                        {request.category && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryColor(request.category)}`}>
                                {request.category}
                            </span>
                        )}
                        <span className='text-xs text-slate-500'>
                            {request.store ? `For ${request.store.name}` : `By ${request.user?.name}`}
                        </span>
                    </div>
                    <div className='text-xs text-slate-500 mt-1'>
                        <CalendarIcon size={12} className='inline mr-1' />
                        {formatDate(request.createdAt)}
                    </div>
                </div>
            </div>
        </Link>
    )
}

export default CustomRequestCard