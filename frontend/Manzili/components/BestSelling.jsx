'use client'
import { useEffect, useState } from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { fetchFeatured } from '@/lib/api/products'
import { useTranslate } from '@/lib/i18n/LocaleContext'

// The homepage "Featured" rail. Pulls the real /products/featured endpoint, which surfaces PAID
// promotions first and tops the rest up with the most popular products — so it's always full
// (no more thin 5-item rail) and reflects sellers who paid to feature their items.
const BestSelling = () => {
    const t = useTranslate()
    const [products, setProducts] = useState([])

    useEffect(() => {
        let alive = true
        fetchFeatured()
            .then((list) => { if (alive) setProducts(Array.isArray(list) ? list : []) })
            .catch(() => { if (alive) setProducts([]) })
        return () => { alive = false }
    }, [])

    if (products.length === 0) return null

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title
                title={t('bestSelling.title')}
                description={t('bestSelling.showing', { count: products.length, total: products.length })}
                href='/shop'
            />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
                {products.map((product, index) => (
                    <ProductCard key={product.id || index} product={product} />
                ))}
            </div>
        </div>
    )
}

export default BestSelling
