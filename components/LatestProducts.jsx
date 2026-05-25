'use client'
import React from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import { useTranslate } from '@/lib/i18n/LocaleContext'

const LatestProducts = () => {
    const t = useTranslate();
    const displayQuantity = 4
    const products = useSelector(state => state.product.list)

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title
              title={t('latestProducts.title')}
              description={t('latestProducts.showing', {
                count: products.length < displayQuantity ? products.length : displayQuantity,
                total: products.length
              })}
              href='/shop'
            />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {products.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, displayQuantity).map((product, index) => (
                    <ProductCard key={index} product={product} />
                ))}
            </div>
        </div>
    )
}

export default LatestProducts
