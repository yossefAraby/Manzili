'use client'
import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4efe4] p-4">
            
            <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[450px] flex flex-col items-center">
                
                {/* Logo */}
                <div className="mb-4">
                    <Image 
                        src={assets.logo} 
                        alt="Manzili Logo" 
                        width={80} 
                        height={80} 
                        className="object-contain" 
                        priority
                    />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-8 font-sans">Create a New Account</h2>

                {/* Data entry form */}
                <form className="w-full flex flex-col gap-4">
                    <input 
                        type="text" 
                        placeholder="Full Name" 
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all" 
                    />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all" 
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all" 
                    />
                    <input 
                        type="password" 
                        placeholder="Confirm Password" 
                        className="w-full border border-[#d6a87c] rounded-full px-6 py-3.5 outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent text-slate-700 bg-[#faf8f5] placeholder:text-slate-500 transition-all" 
                    />

                    <button 
                        type="button"
                        className="w-full bg-gradient-to-r from-[#e67e22] to-[#d35400] hover:scale-[1.02] active:scale-95 text-white font-semibold rounded-full py-3.5 mt-2 transition-all shadow-md text-lg uppercase"
                    >
                        Sign Up
                    </button>
                </form>

                {/* Separator and social media icons (added section) */}
                <div className="flex items-center w-full my-8 gap-3">
                    <hr className="flex-1 border-slate-200" />
                    <span className="text-sm text-slate-500">Or Sign Up with</span>
                    <hr className="flex-1 border-slate-200" />
                </div>

                <div className="flex gap-5 justify-center mb-6">
                    {/* Gradient definition */}
                    <svg width="0" height="0" className="absolute">
                        <defs>
                            <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#f39c12" />
                                <stop offset="100%" stopColor="#d35400" />
                            </linearGradient>
                        </defs>
                    </svg>
                    
                    <button className="hover:scale-110 transition-transform">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="url(#orange-gradient)"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    </button>
                    <button className="hover:scale-110 transition-transform">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="url(#orange-gradient)"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </button>
                    <button className="hover:scale-110 transition-transform">
                        <svg width="35" height="35" viewBox="0 0 24 24" fill="url(#orange-gradient)"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </button>
                </div>

                {/* Terms and Conditions */}
                <div className="flex flex-col items-center text-xs text-slate-600">
                    <p>By signing up, you agree to our</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <input type="checkbox" id="terms" className="accent-[#e67e22] w-4 h-4 cursor-pointer" />
                        <label htmlFor="terms" className="cursor-pointer text-[#1c355e] hover:underline">Terms and Conditions</label>
                    </div>
                </div>

                {/* Login link */}
                <p className="mt-8 text-slate-700 font-medium text-sm text-center">
                    Already have an account? <Link href="/login" className="text-[#d35400] font-bold hover:underline transition-all">Log In</Link>
                </p>

            </div>
        </div>
    );
}