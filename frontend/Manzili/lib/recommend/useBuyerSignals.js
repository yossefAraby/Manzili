'use client'
// Assembles the buyer "signals" the AI recommender reasons over, entirely from data the
// client already has: their saved-address city (proximity), the categories they engage with
// (orders + cart + wishlist), and the prices they tend to pay (budget-vs-quality). Cart and
// wishlist only store ids, so categories/prices are recovered by joining against the warm
// Redux catalog (state.product.list); order history (the only source with the price actually
// paid) is fetched once and cached module-wide.
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectIsLoggedIn } from '@/lib/features/auth/authSlice'
import { fetchOrders } from '@/lib/api/orders'

// Module-level cache so every consumer (home rail, product rail, AI search) shares one fetch.
let ordersCache = null
let ordersPromise = null
async function loadOrders() {
  if (ordersCache) return ordersCache
  if (!ordersPromise) {
    ordersPromise = fetchOrders()
      .then((o) => { ordersCache = Array.isArray(o) ? o : []; return ordersCache })
      .catch(() => { ordersCache = []; return ordersCache })
  }
  return ordersPromise
}

/**
 * @param {{ enabled?: boolean }} opts - when false, skip the (logged-in) order fetch.
 * @returns signals = { city, bostaCityId, categories:[{name,count}], pricePoints:[n], avgPaid, ownedIds:[] }
 */
export function useBuyerSignals({ enabled = true } = {}) {
  const products = useSelector((s) => s.product.list)
  const cartItems = useSelector((s) => s.cart.cartItems)
  const wishlistItems = useSelector((s) => s.wishlist.wishlistItems)
  const addresses = useSelector((s) => s.address.list)
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const [orders, setOrders] = useState(ordersCache || [])

  useEffect(() => {
    if (!enabled || !isLoggedIn) return undefined
    let alive = true
    loadOrders().then((o) => { if (alive) setOrders(o) })
    return () => { alive = false }
  }, [enabled, isLoggedIn])

  return useMemo(() => {
    const byId = new Map((products || []).map((p) => [String(p.id), p]))
    const catCount = new Map()
    const prices = []
    const owned = new Set()
    const addCat = (c, w = 1) => { const k = (c || '').trim(); if (k) catCount.set(k, (catCount.get(k) || 0) + w) }
    const addPrice = (p) => { const n = Number(p); if (Number.isFinite(n) && n > 0) prices.push(n) }

    // Orders — strongest signal: real paid price + category travel with each line.
    for (const o of orders || []) {
      for (const it of o.orderItems || []) {
        if (it.productId != null) owned.add(String(it.productId))
        addCat(it.product?.category, 2)
        addPrice(it.price)
      }
    }
    // Cart — current intent (join ids against the catalog for price/category).
    for (const key of Object.keys(cartItems || {})) {
      const ci = cartItems[key]
      const pid = String(ci?.productId ?? '')
      if (!pid) continue
      owned.add(pid)
      const p = byId.get(pid)
      if (p) { addCat(p.category, 1.5); addPrice(p.price) }
    }
    // Wishlist — taste (ids only; join for price/category).
    for (const id of Object.keys(wishlistItems || {})) {
      owned.add(String(id))
      const p = byId.get(String(id))
      if (p) { addCat(p.category, 1); addPrice(p.price) }
    }

    const addr = (addresses || [])[0]
    const categories = [...catCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count: Math.round(count) }))
    const pricePoints = prices.slice(0, 40)
    const avgPaid = pricePoints.length
      ? Math.round(pricePoints.reduce((a, b) => a + b, 0) / pricePoints.length)
      : null

    return {
      city: addr?.city || null,
      bostaCityId: addr?.bostaCityId || null,
      categories,
      pricePoints,
      avgPaid,
      ownedIds: [...owned],
    }
  }, [products, cartItems, wishlistItems, addresses, orders])
}
