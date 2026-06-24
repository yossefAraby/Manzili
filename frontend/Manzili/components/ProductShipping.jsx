'use client'
// Plain one-line delivery estimate shown directly under the product price. Shows the BUYER's
// share of the Bosta fee (the seller covers the rest) — the same number the cart charges — sized
// by the parcel and the distance from the seller's city to the buyer's saved address city.
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { getCurrencySymbol } from '@/lib/currency'
import { estimateProductShipping } from '@/lib/api/shipping'
import { quoteBySize, buyerShare } from '@/lib/shipping/bostaPricing'

export default function ProductShipping({ product }) {
  const t = useTranslate()
  const currency = getCurrencySymbol()
  const addresses = useSelector((s) => s.address.list)
  const addr = (addresses || [])[0]
  const buyerCity = addr?.city || addr?.bostaCityName || null

  const [est, setEst] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!product?.id) return undefined
    let alive = true
    setLoading(true)
    estimateProductShipping(product.id, { city: buyerCity, bostaCityId: addr?.bostaCityId })
      .then((r) => { if (alive) setEst(r) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [product?.id, buyerCity, addr?.bostaCityId])

  if (loading) return null // stay quiet (no box) until we have a number

  // Full Bosta fee → the buyer pays only their share (matches the cart + custom-form estimate).
  let fullLow = est?.low
  let fullHigh = est?.high
  if (fullLow == null || fullHigh == null) {
    if (est?.estimatedShipping != null) {
      fullLow = est.estimatedShipping
      fullHigh = est.estimatedShipping
    } else {
      const fb = quoteBySize(product?.shippingSize || 'MEDIUM', product?.shippingBulkyCategory || 'NORMAL')
      fullLow = fb.low
      fullHigh = fb.high
    }
  }
  if (fullLow == null || fullHigh == null) return null

  const low = buyerShare(fullLow)
  const high = buyerShare(fullHigh)
  const amount = low === high ? `${currency}${low}` : `${currency}${low}–${currency}${high}`

  return (
    <p className="text-sm text-slate-500 mb-4">
      {t('productShipping.title')}{' '}
      <span className="font-medium text-slate-700">{amount}</span>
      {buyerCity ? ` ${t('productShipping.toCityShort', { city: buyerCity })}` : ''}
    </p>
  )
}
