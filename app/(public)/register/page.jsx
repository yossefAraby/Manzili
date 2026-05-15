'use client'

import Link from 'next/link'
import Image from 'next/image'
import { assets } from '@/assets/assets'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSession } from '@/lib/features/auth/authSlice'
import { setAddressList } from '@/lib/features/address/addressSlice'
import {
    loadAddressesForUser,
    persistAuthSession,
    readAuthUsers,
    reconcileAuthSession,
    writeAuthUsers,
} from '@/lib/services/localStateBootstrap'
import { makeEntityId } from '@/lib/storage/localStorageEnvelope'

export default function RegisterPage() {
    const router = useRouter()
    const dispatch = useDispatch()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [acceptTerms, setAcceptTerms] = useState(false)

    const onRegister = (e) => {
        e.preventDefault()
        if (password !== confirm) {
            alert('Passwords do not match')
            return
        }
        if (!acceptTerms) {
            alert('Please accept the Terms & Conditions to continue')
            return
        }
        const users = readAuthUsers()
        if (users.some((x) => String(x.email).toLowerCase() === email.trim().toLowerCase())) {
            alert('Email already registered')
            return
        }
        const userId = makeEntityId('usr')
        const trimmedName = name.trim()
        const trimmedEmail = email.trim().toLowerCase()
        const newUser = {
            userId,
            name: trimmedName,
            email: trimmedEmail,
            password,
            storeId: null,
        }
        writeAuthUsers([...users, newUser])

        let session = {
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email,
            storeId: null,
        }

        session = reconcileAuthSession(session)
        persistAuthSession(session)
        dispatch(setSession(session))
        dispatch(setAddressList(loadAddressesForUser(session.userId)))
        router.push('/')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4efe4] p-4">
            <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[450px] flex flex-col items-center">
                <div className="mb-4">
                    <Image src={assets.logo} alt="Manzili Logo" width={80} height={80} className="object-contain" priority />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-8 font-sans">Create account</h2>

                <form className="w-full flex flex-col gap-4" onSubmit={onRegister}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5] text-slate-700"
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5] text-slate-700"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5] text-slate-700"
                    />
                    <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Confirm password"
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
                        Sign up
                    </button>
                </form>

                <p className="mt-8 text-slate-700 font-medium text-sm text-center">
                    Already have an account?{' '}
                    <Link href="/login" className="text-[#d35400] font-bold hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    )
}
