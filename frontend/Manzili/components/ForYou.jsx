'use client'
// Home "For You" rail. Same engine as the product-page "Recommended for you": vector recommendations
// (GET /search/recommend) seeded with the products the shopper has engaged with (orders/cart/wishlist)
// — nearest to their taste centroid, instant and token-free. A fresh visitor (no seeds) gets popular
// items from the backend. Hidden entirely when there's nothing to show.
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useSelector } from 'react-redux'
import ProductCard from './ProductCard'
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { useBuyerSignals } from '@/lib/recommend/useBuyerSignals'
import { selectIsLoggedIn } from '@/lib/features/auth/authSlice'
import { fetchRecommended } from '@/lib/api/products'

const COUNT = 4

const ForYou = () => {
  const t = useTranslate()
  const isLoggedIn = useSelector(selectIsLoggedIn)
  // Only mine signals (incl. the orders fetch) for signed-in shoppers — the rail is theirs.
  const signals = useBuyerSignals({ enabled: isLoggedIn })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const seedsKey = (signals.ownedIds || []).join(',')
  useEffect(() => {
    if (!isLoggedIn) { setItems([]); setLoading(false); return undefined }
    let alive = true
    setLoading(true)
    const seeds = seedsKey ? seedsKey.split(',') : []
    // taste:true → backend also seeds from the shopper's recently-viewed products, so the rail is
    // personalized even when they haven't ordered/carted/wishlisted anything yet.
    fetchRecommended(seeds, COUNT, true)
      .then((list) => { if (alive) setItems(list) })
      .catch(() => { if (alive) setItems([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [isLoggedIn, seedsKey])

  // "For You" is a personalized rail — hidden entirely for guests.
  if (!isLoggedIn) return null
  if (!loading && items.length === 0) return null

  return (
    <div className='px-6 my-30 max-w-6xl mx-auto'>
      <div className='flex flex-col items-center'>
        <h2 className='text-2xl font-semibold text-slate-800 flex items-center gap-2'>
          <Sparkles size={20} className='text-[#2582eb]' />
          {t('forYou.title')}
        </h2>
        <p className='max-w-lg text-center text-sm text-slate-600 mt-2'>{t('forYou.subtitle')}</p>
      </div>
      <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
        {loading
          ? Array.from({ length: COUNT }).map((_, i) => (
              <div key={i} className='animate-pulse rounded-lg bg-slate-100 w-full sm:w-60 h-68' />
            ))
          : items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </div>
  )
}

export default ForYou
