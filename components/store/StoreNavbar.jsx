'use client'
import Link from "next/link"
import Image from "next/image";
import { assets } from "@/assets/assets";
import { useDispatch, useSelector } from "react-redux";
import { clearSession } from "@/lib/features/auth/authSlice";
import { setAddressList } from "@/lib/features/address/addressSlice";
import { loadAddressesForUser, persistAuthSession } from "@/lib/services/localStateBootstrap";

const StoreNavbar = () => {
    const dispatch = useDispatch();
    const session = useSelector((s) => s.auth.session);

    const logout = () => {
        persistAuthSession(null);
        dispatch(clearSession());
        dispatch(setAddressList(loadAddressesForUser('guest')));
    };

    return (
        <div className="flex items-center justify-between px-12 py-3 border-b border-slate-200 transition-all">
            <Link href="/" className="flex items-center gap-3 relative text-5xl font-bold font-sans">
                <div className="relative flex items-baseline">
                    <span className="text-[#1c355e]">M</span>
                    <span className="bg-gradient-to-b from-[#e3cda8] to-[#aa804c] text-transparent bg-clip-text">anzili</span>
                </div>
                <Image src={assets.logo} alt="logo" width={50} height={50} className="object-contain" priority />
            </Link>
            <div className="flex items-center gap-3 text-sm text-slate-600">
                <p>Hi, {session?.name || 'Guest'}</p>
                {session?.userId && (
                    <button type="button" onClick={logout} className="text-[#2582eb] hover:underline">
                        Log out
                    </button>
                )}
                {!session?.userId && (
                    <Link href="/login" className="text-[#2582eb] hover:underline">Log in</Link>
                )}
            </div>
        </div>
    )
}

export default StoreNavbar

