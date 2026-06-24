'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import Link from 'next/link'
import { ArrowRightIcon, ShieldCheckIcon, LoaderIcon } from 'lucide-react'
import { setAdminSession } from '@/lib/features/auth/authSlice'
import { apiAdminLogin } from '@/lib/api/auth'

/**
 * Admin portal login — a separate login system from the buyer/seller one.
 * Authenticates against /admin/auth/login (admin accounts only) and stores an
 * admin-role session, which AdminLayout gates on.
 */
export default function AdminLoginPage() {
  const router = useRouter()
  const dispatch = useDispatch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const session = await apiAdminLogin({ username: username.trim(), password })
      dispatch(setAdminSession(session))
      router.replace('/admin')
    } catch (err) {
      setError(err?.message || 'Invalid admin credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#faf8f5]">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1c355e] text-white flex items-center justify-center">
            <ShieldCheckIcon size={24} />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-800">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Manzili administration portal</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <label className="text-sm text-slate-700">
            Username
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb]"
              placeholder="e.g. yossef"
            />
          </label>
          <label className="text-sm text-slate-700">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb]"
              placeholder="Password"
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#1c355e] py-3 text-white font-medium hover:bg-[#2582eb] transition-colors disabled:opacity-60"
          >
            {submitting ? <LoaderIcon size={18} className="animate-spin" /> : null}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      <Link href="/" className="mt-10 text-[#2582eb] hover:underline inline-flex items-center gap-2">
        Back to home <ArrowRightIcon size={18} />
      </Link>
    </div>
  )
}
