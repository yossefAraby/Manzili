'use client'

import Link from 'next/link'
import Image from 'next/image'
import { assets } from '@/assets/assets'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSession } from '@/lib/features/auth/authSlice'
import { hydrateCart } from '@/lib/features/cart/cartSlice'
import { mergeServerCart } from '@/lib/api/cart'
import { hydrateAddresses } from '@/lib/features/address/addressSlice'
import { apiRegister } from '@/lib/api/auth'
import { useTranslate } from '@/lib/i18n/LocaleContext'
import GoogleSignInButton from '@/components/GoogleSignInButton'

function RegisterInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch()
    const guestCart = useSelector((s) => s.cart.cartItems)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [touched, setTouched] = useState({})
    const [attempted, setAttempted] = useState(false)

    const t = useTranslate()

    // Safe post-signup destination from ?next= (must be an in-app path). Lets the
    // add-to-cart / custom-request guards return the user where they came from.
    const nextParam = searchParams.get('next')
    const redirectDest =
        nextParam && typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//')
            ? nextParam
            : '/'

    // Mirror the backend RegisterRequestValidator EXACTLY (AuthValidators.cs):
    //   name 2–100, valid email ≤100, password 6–50. Plus confirm-match + terms (client-only).
    // Validating here means the generic backend "Validation failed" 400 is never the first thing
    // the user sees — they get a clear per-field reason and a disabled button until it's all good.
    const nameTrim = name.trim()
    const emailTrim = email.trim()
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)
    const errors = {
        name: !nameTrim ? t('register.err.nameRequired')
            : nameTrim.length < 2 ? t('register.err.nameShort')
            : nameTrim.length > 100 ? t('register.err.nameLong') : '',
        email: !emailTrim ? t('register.err.emailRequired')
            : !emailOk ? t('register.err.emailInvalid')
            : emailTrim.length > 100 ? t('register.err.emailLong') : '',
        password: !password ? t('register.err.passwordRequired')
            : password.length < 6 ? t('register.err.passwordShort')
            : password.length > 50 ? t('register.err.passwordLong') : '',
        confirm: !confirm ? t('register.err.confirmRequired')
            : confirm !== password ? t('register.err.passwordsDontMatch') : '',
        terms: !acceptTerms ? t('register.err.termsRequired') : '',
    }
    const isValid = !errors.name && !errors.email && !errors.password && !errors.confirm && !errors.terms
    // Show a field's error only once the user has touched it (or tried to submit) — no red on first paint.
    const showErr = (field) => (touched[field] || attempted) && errors[field]
    const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }))
    const inputClass = (field) =>
        `w-full border rounded-full px-6 py-3.5 outline-none focus:ring-2 bg-[#faf8f5] text-slate-700 ${
            showErr(field) ? 'border-red-400 focus:ring-red-300' : 'border-[#d6a87c] focus:ring-[#e67e22]'
        }`

    const onRegister = async (e) => {
        e.preventDefault()
        if (submitting) return
        if (!isValid) { setAttempted(true); return } // reveal all field errors; button is also disabled
        setSubmitting(true)
        try {
            const session = await apiRegister({
                name: nameTrim,
                email: emailTrim.toLowerCase(),
                password,
            })
            dispatch(setSession(session))
            dispatch(hydrateAddresses())
            // Carry the guest cart the buyer built before signing up onto their new account.
            const merged = await mergeServerCart(guestCart)
            if (merged) dispatch(hydrateCart(merged))
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

                <form className="w-full flex flex-col gap-4" onSubmit={onRegister} noValidate>
                    <div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => markTouched('name')}
                            placeholder={t('register.name')}
                            className={inputClass('name')}
                        />
                        {showErr('name') && <p className="text-xs text-red-500 px-3 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => markTouched('email')}
                            placeholder={t('register.email')}
                            className={inputClass('email')}
                        />
                        {showErr('email') && <p className="text-xs text-red-500 px-3 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => markTouched('password')}
                            placeholder={t('register.password')}
                            className={inputClass('password')}
                        />
                        {showErr('password')
                            ? <p className="text-xs text-red-500 px-3 mt-1">{errors.password}</p>
                            : <p className="text-xs text-slate-400 px-3 mt-1">{t('register.passwordHint')}</p>}
                    </div>
                    <div>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            onBlur={() => markTouched('confirm')}
                            placeholder={t('register.confirmPassword')}
                            className={inputClass('confirm')}
                        />
                        {showErr('confirm') && <p className="text-xs text-red-500 px-3 mt-1">{errors.confirm}</p>}
                    </div>

                    <label className="flex items-start gap-2 text-sm text-slate-600 px-1">
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => { setAcceptTerms(e.target.checked); markTouched('terms') }}
                            className="accent-[#e67e22] mt-0.5"
                        />
                        <span>
                            I agree to Manzili&apos;s{' '}
                            <Link href="/privacy-policy" className="text-[#d35400] hover:underline font-medium">
                                Terms &amp; Conditions and Privacy Policy
                            </Link>
                            .
                        </span>
                    </label>
                    {showErr('terms') && <p className="text-xs text-red-500 px-1 -mt-2">{errors.terms}</p>}

                    <p className="text-xs text-slate-500 px-1 -mt-1">
                        Are you an artisan? You can apply to open a store any time from{' '}
                        <Link href="/create-store" className="text-[#d35400] hover:underline font-medium">
                            Create your store
                        </Link>{' '}
                        after signing up — one store per account.
                    </p>

                    <button
                        type="submit"
                        disabled={!isValid || submitting}
                        className={`w-full font-semibold rounded-full py-3.5 mt-2 shadow-md text-lg uppercase text-white transition ${
                            !isValid || submitting
                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-[#e67e22] to-[#d35400]'
                        }`}
                    >
                        {submitting ? t('common.loading') : t('register.registerBtn')}
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
