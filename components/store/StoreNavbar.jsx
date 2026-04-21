'use client'
import Link from "next/link"
import Image from "next/image";
import { assets } from "@/assets/assets";

const StoreNavbar = () => {


    return (
        <div className="flex items-center justify-between px-12 py-3 border-b border-slate-200 transition-all">
            <Link href="/" className="flex items-center gap-3 relative text-5xl font-bold font-sans">
                <div className="relative flex items-baseline">
                    <span className="text-[#1c355e]">M</span>
                    <span className="bg-gradient-to-b from-[#e3cda8] to-[#aa804c] text-transparent bg-clip-text">anzili</span>
                </div>
                <Image src={assets.logo} alt="logo" width={50} height={50} className="object-contain" priority />
            </Link>
            <div className="flex items-center gap-3">
                <p>Hi, Seller</p>
            </div>
        </div>
    )
}

export default StoreNavbar


