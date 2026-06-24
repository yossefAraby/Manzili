'use client'

// "Continue with Google" button (Google Identity Services).
//
// Renders nothing unless NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, so the app is unaffected until
// Google login is configured. On success the backend sets the SAME httpOnly cookie session as a
// password login, so we just adopt the session into Redux and navigate — identical to onLogin.

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useStore } from 'react-redux'
import { setSession } from '@/lib/features/auth/authSlice'
import { hydrateCart } from '@/lib/features/cart/cartSlice'
import { mergeServerCart } from '@/lib/api/cart'
import { hydrateAddresses } from '@/lib/features/address/addressSlice'
import { apiGoogleLogin } from '@/lib/api/auth'

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export default function GoogleSignInButton({ redirectTo = '/' }) {
  const router = useRouter()
  const dispatch = useDispatch()
  const store = useStore()
  const containerRef = useRef(null)

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return
    let cancelled = false
    let timer = null

    async function handleCredential(response) {
      try {
        const session = await apiGoogleLogin(response.credential)
        dispatch(setSession(session))
        dispatch(hydrateAddresses())
        // Merge the guest cart into the account cart, then show the unified account cart.
        const merged = await mergeServerCart(store.getState().cart.cartItems)
        if (merged) dispatch(hydrateCart(merged))
        router.push(redirectTo || '/')
      } catch (err) {
        alert(err?.message || 'Google sign-in failed')
      }
    }

    // The GIS script loads async (next/script, afterInteractive) — poll until it's ready.
    const tryInit = () => {
      if (cancelled) return
      const gid = window.google?.accounts?.id
      if (!gid) {
        timer = setTimeout(tryInit, 150)
        return
      }
      gid.initialize({ client_id: CLIENT_ID, callback: handleCredential })
      gid.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      })
    }
    timer = setTimeout(tryInit, 0)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [dispatch, router, redirectTo])

  if (!CLIENT_ID) return null

  return (
    <div className="w-full flex flex-col items-center mt-5">
      <div className="flex items-center w-full gap-3 mb-4">
        <span className="h-px bg-slate-200 flex-1" />
        <span className="text-xs text-slate-400 uppercase tracking-wide">or</span>
        <span className="h-px bg-slate-200 flex-1" />
      </div>
      <div ref={containerRef} className="min-h-[44px]" />
    </div>
  )
}
