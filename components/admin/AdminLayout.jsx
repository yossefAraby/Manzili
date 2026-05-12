'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import AdminNavbar from "./AdminNavbar"
import AdminSidebar from "./AdminSidebar"

const ADMIN_UNLOCK_KEY = "manzili_admin_pass_ok"

export default function AdminLayout({ children }) {

    const passkey = process.env.NEXT_PUBLIC_ADMIN_PASSKEY ?? "admin"

    const [hydrated, setHydrated] = useState(false)
    const [unlocked, setUnlocked] = useState(false)
    const [input, setInput] = useState("")
    const [error, setError] = useState("")

    useEffect(() => {
        try {
            setUnlocked(sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "1")
        } catch {
            setUnlocked(false)
        }
        setHydrated(true)
    }, [])

    const onSubmit = (e) => {
        e.preventDefault()
        setError("")
        if (input === passkey) {
            try {
                sessionStorage.setItem(ADMIN_UNLOCK_KEY, "1")
            } catch {
                // ignore
            }
            setUnlocked(true)
            setInput("")
            return
        }
        setError("Incorrect passkey.")
    }

    if (!hydrated) {
        return <Loading />
    }

    return unlocked ? (
        <div className="flex flex-col h-screen">
            <AdminNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <AdminSidebar />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#faf8f5]">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                <h1 className="text-xl font-semibold text-slate-800">Admin access</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Enter the admin passkey to open this area (no user account required).
                </p>
                <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 text-left">
                    <label className="text-sm text-slate-700">
                        Passkey
                        <input
                            type="password"
                            autoComplete="off"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb]"
                            placeholder="Passkey"
                        />
                    </label>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                        type="submit"
                        className="mt-2 rounded-full bg-[#1c355e] py-3 text-white font-medium hover:bg-[#2582eb] transition-colors"
                    >
                        Unlock admin
                    </button>
                </form>
            </div>
            <Link href="/" className="mt-10 text-[#2582eb] hover:underline inline-flex items-center gap-2">
                Back to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}
