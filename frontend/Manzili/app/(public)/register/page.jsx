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
import { apiRegister } from '@/lib/api/auth'
import { useTranslate } from '@/lib/i18n/LocaleContext'
import GoogleSignInButton from '@/components/GoogleSignInButton'

function RegisterInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const t = useTranslate()

    // Safe post-signup destination from ?next= (must be an in-app path). Lets the
    // add-to-cart / custom-request guards return the user where they came from.
    const nextParam = searchParams.get('next')
    const redirectDest =
        nextParam && typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//')
            ? nextParam
            : '/'

    const onRegister = async (e) => {
        e.preventDefault()
        if (submitting) return
        if (password !== confirm) {
            alert(t('register.passwordsDontMatch'))
            return
        }
        if (!acceptTerms) {
            alert('Please accept the Terms & Conditions to continue')
            return
        }
        setSubmitting(true)
        try {
            const session = await apiRegister({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
            })
            // Start the new account with a clean cart (don't inherit a guest cart).
            dispatch(clearCart())
            dispatch(setSession(session))
            dispatch(hydrateAddresses())
            router.push(redirectDest)
        } catch (err) {
            alert(err?.message || 'Registration failed')
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

                <h2 className="text-2xl font-bold text-slate-800 mb-8 font-sans">{t('register.title')}</h2>

                <form className="w-full flex flex-col gap-4" onSubmit={onRegister}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('register.name')}
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5] text-slate-700"
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('register.email')}
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5] text-slate-700"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('register.password')}
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5] text-slate-700"
                    />
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder={t('register.confirmPassword')}
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5] text-slate-700"
                    />

                    <label className="flex items-start gap-2 text-sm text-slate-600 px-1">
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="accent-[#e67e22] mt-0.5"
                            required
                        />
                        <span>
                            I agree to Manzili&apos;s{' '}
                            <Link href="/privacy-policy" className="text-[#d35400] hover:underline font-medium">
                                Terms &amp; Conditions and Privacy Policy
                            </Link>
                            .
                        </span>
                    </label>

                    <p className="text-xs text-slate-500 px-1 -mt-1">
                        Are you an artisan? You can apply to open a store any time from{' '}
                        <Link href="/create-store" className="text-[#d35400] hover:underline font-medium">
                            Create your store
                        </Link>{' '}
                        after signing up — one store per account.
                    </p>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#e67e22] to-[#d35400] text-white font-semibold rounded-full py-3.5 mt-2 shadow-md text-lg uppercase"
                    >
                        {t('register.registerBtn')}
                    </button>
                </form>

                <GoogleSignInButton redirectTo={redirectDest} />

                <p className="mt-8 text-slate-700 font-medium text-sm text-center">
                    {t('register.haveAccount')}{' '}
                    <Link href="/login" className="text-[#d35400] font-bold hover:underline">
                        {t('register.login')}
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function RegisterPage() {
    const t = useTranslate()
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#f4efe4] p-4 text-slate-500 text-sm">
                    {t('common.loading')}
                </div>
            }
        >
            <RegisterInner />
        </Suspense>
    )
}
