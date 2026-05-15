'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { useSelector } from "react-redux"
import { findStoreById } from "@/lib/services/localStoreRegistry"

const StoreLayout = ({ children }) => {

    const session = useSelector((s) => s.auth.session)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)

    useEffect(() => {
        setLoading(true)
        if (!session?.userId) {
            setStoreInfo(null)
            setLoading(false)
            return
        }
        if (!session.storeId) {
            setStoreInfo(null)
            setLoading(false)
            return
        }
        const record = findStoreById(session.storeId)
        if (!record || record.userId !== session.userId) {
            setStoreInfo(null)
            setLoading(false)
            return
        }
        setStoreInfo(record)
        setLoading(false)
    }, [session])

    const hasAccount = Boolean(session?.userId)
    const hasStore = Boolean(session?.storeId && storeInfo)

    return loading ? (
        <Loading />
    ) : !hasAccount ? (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[#faf8f5]">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-700">Sign in to manage your store</h1>
            <p className="mt-3 text-slate-600 max-w-md">
                The seller dashboard is tied to your account. Log in or register — sellers get one store per account.
            </p>
            <div className="flex gap-4 mt-8">
                <Link href="/login" className="bg-slate-800 text-white px-6 py-2.5 rounded-full hover:bg-slate-900 transition-colors">
                    Log in
                </Link>
                <Link href="/register" className="border border-slate-300 text-slate-800 px-6 py-2.5 rounded-full hover:bg-slate-50 transition-colors">
                    Create account
                </Link>
            </div>
            <Link href="/" className="mt-10 text-[#2582eb] hover:underline inline-flex items-center gap-2">
                Back to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    ) : !hasStore ? (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[#faf8f5]">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-700">Open your store on Manzili</h1>
            <p className="mt-3 text-slate-600 max-w-md">
                You haven&apos;t registered a store yet. Head over to the seller form to add your logo, contact info and
                address — each account can own one store.
            </p>
            <div className="flex gap-4 mt-8">
                <Link
                    href="/create-store"
                    className="bg-slate-800 text-white px-6 py-2.5 rounded-full hover:bg-slate-900 transition-colors"
                >
                    Create your store
                </Link>
                <Link
                    href="/"
                    className="border border-slate-300 text-slate-800 px-6 py-2.5 rounded-full hover:bg-slate-50 transition-colors"
                >
                    Back to home
                </Link>
            </div>
        </div>
    ) : (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <SellerSidebar storeInfo={storeInfo} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default StoreLayout
