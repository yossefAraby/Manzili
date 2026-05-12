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
} from '@/lib/services/localStateBootstrap'

export default function LoginPage() {
    const router = useRouter()
    const dispatch = useDispatch()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const onLogin = (e) => {
        e.preventDefault()
        const users = readAuthUsers()
        const u = users.find((x) => String(x.email).toLowerCase() === email.trim().toLowerCase())
        if (!u || u.password !== password) {
            alert('Invalid email or password')
            return
        }
        const session = reconcileAuthSession({
            userId: u.userId,
            name: u.name,
            email: u.email,
            storeId: u.storeId || null,
        })
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

                <h2 className="text-2xl font-bold text-slate-800 mb-1 font-sans">Welcome to Manzili</h2>
                <h3 className="text-xl font-bold text-slate-800 mb-8 font-sans">Log In</h3>

                <form className="w-full flex flex-col gap-4" onSubmit={onLogin}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all"
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all"
                    />

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#e67e22] to-[#d35400] hover:scale-[1.02] active:scale-95 text-white font-semibold rounded-full py-3.5 mt-2 transition-all shadow-md text-lg"
                    >
                        LOG IN
                    </button>
                </form>

                <p className="mt-8 text-slate-700 font-medium text-sm text-center">
                    No account?{' '}
                    <Link href="/register" className="text-[#d35400] font-bold hover:underline transition-all">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    )
}
