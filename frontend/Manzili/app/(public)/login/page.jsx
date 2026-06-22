'use client'

import Link from 'next/link'
import Image from 'next/image'
import { assets } from '@/assets/assets'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSession } from '@/lib/features/auth/authSlice'
import { clearCart } from '@/lib/features/cart/cartSlice'
import { hydrateAddresses } from '@/lib/features/address/addressSlice'
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { apiLogin } from '@/lib/api/auth'
import GoogleSignInButton from '@/components/GoogleSignInButton'

function LoginInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const t = useTranslate()

    // Safe post-login destination from ?next= (must be an in-app path). Shared by the
    // password form and the Google button.
    const nextParam = searchParams.get('next')
    const redirectDest =
        nextParam && typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//')
            ? nextParam
            : '/'

    const onLogin = async (e) => {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)
        try {
            const session = await apiLogin({ email: email.trim(), password })
            // Drop any guest/previous-account cart before adopting this session so
            // the new user never inherits another account's cart on this browser.
            dispatch(clearCart())
            dispatch(setSession(session))
            dispatch(hydrateAddresses())
            router.push(redirectDest)
        } catch (err) {
            alert(err?.message || t('login.loginError'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4efe4] p-4">
            <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[450px] flex flex-col items-center">
                <div className="mb-4">
                    <Image src={assets.logo} alt="Manzili Logo" width={80} height={80} className="object-contain" priority />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-1 font-sans">{t('login.title')}</h2>
                <h3 className="text-xl font-bold text-slate-800 mb-8 font-sans">{t('login.subtitle')}</h3>

                <form className="w-full flex flex-col gap-4" onSubmit={onLogin}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('login.email')}
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all"
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('login.password')}
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all"
                    />

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#e67e22] to-[#d35400] hover:scale-[1.02] active:scale-95 text-white font-semibold rounded-full py-3.5 mt-2 transition-all shadow-md text-lg"
                    >
                        {t('login.loginBtn')}
                    </button>
                </form>

                <GoogleSignInButton redirectTo={redirectDest} />

                <p className="mt-8 text-slate-700 font-medium text-sm text-center">
                    {t('login.noAccount')}{' '}
                    <Link href="/register" className="text-[#d35400] font-bold hover:underline transition-all">
                        {t('login.signUp')}
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    const t = useTranslate()
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#f4efe4] p-4 text-slate-500 text-sm">
                    {t('common.loading')}
                </div>
            }
        >
            <LoginInner />
        </Suspense>
    )
}
