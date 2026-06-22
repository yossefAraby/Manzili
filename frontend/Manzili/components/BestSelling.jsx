'use client'
import Title from './Title'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import { useTranslate } from '@/lib/i18n/LocaleContext'

const BestSelling = () => {
    const t = useTranslate();
    const displayQuantity = 8
    const products = useSelector(state => state.product.list)

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title
              title={t('bestSelling.title')}
              description={t('bestSelling.showing', {
                count: products.length < displayQuantity ? products.length : displayQuantity,
                total: products.length
              })}
              href='/shop'
            />
            <div className='mt-12  grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
                {products.slice().sort((a, b) => b.rating.length - a.rating.length).slice(0, displayQuantity).map((product, index) => (
                    <ProductCard key={index} product={product} />
                ))}
            </div>
        </div>
    )
}

export default BestSelling
