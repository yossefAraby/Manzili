'use client'
// Product-page "Recommended for you" — the SAME engine + call as the home "For You" rail
// (fetchRecommended → /search/recommend → vector nearest-neighbour on a seed centroid). Here the
// seed set is the VIEWED product PLUS the shopper's engaged products (orders/cart/wishlist), so
// recs are "like this item, nudged toward your taste". Instant and token-free. For a shopper with
// no history the seeds are just [this product] → pure "more like this".
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import ProductCard from './ProductCard'
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { useBuyerSignals } from '@/lib/recommend/useBuyerSignals'
import { fetchRecommended } from '@/lib/api/products'

const COUNT = 4

const ProductRecommendations = ({ product }) => {
  const t = useTranslate()
  const signals = useBuyerSignals({ enabled: true })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const productId = product?.id

  // Seeds = the viewed product + the shopper's engaged products (capped so the current item
  // stays meaningful in the centroid). The backend excludes all seeds from the results.
  const engaged = (signals.ownedIds || [])
    .filter((id) => String(id) !== String(productId))
    .slice(0, 10)
  const seedsKey = [productId, ...engaged].filter(Boolean).join(',')

  useEffect(() => {
    if (!productId) return undefined
    let alive = true
    setLoading(true)
    const seeds = seedsKey ? seedsKey.split(',') : []
    fetchRecommended(seeds, COUNT)
      .then((list) => { if (alive) setItems(list) })
      .catch(() => { if (alive) setItems([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, seedsKey])

  if (!loading && items.length === 0) return null

  return (
    <div className='my-20'>
      <div className='flex items-center gap-2 mb-8'>
        <Sparkles size={20} className='text-[#2582eb]' />
        <h2 className='text-xl font-semibold text-slate-800'>{t('recommend.title')}</h2>
      </div>
      <div className='grid grid-cols-2 sm:flex flex-wrap gap-6'>
        {loading
          ? Array.from({ length: COUNT }).map((_, i) => (
              <div key={i} className='animate-pulse rounded-lg bg-slate-100 w-full sm:w-60 h-68' />
            ))
          : items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}

export default ProductRecommendations
