"use client";
import { Search, ShoppingCart, CircleUserRound } from "lucide-react"; // Add CircleUserRound
import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";

const Navbar = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const cartCount = useSelector((state) => state.cart.total);

  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/shop?search=${search}`);
  };

  return (
    <nav className="relative bg-white">
      <div className="mx-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">
          {/* Logo and site name (Manzili) */}
          <Link
            href="/"
            className="flex items-center gap-3 relative text-5xl font-bold font-sans"
          >
            <div className="relative flex items-baseline">
              <span className="text-[#1c355e]">M</span>
              <span className="bg-gradient-to-b from-[#e3cda8] to-[#aa804c] text-transparent bg-clip-text">
                anzili
              </span>
            </div>
            <Image
              src={assets.logo}
              alt="logo"
              width={50}
              height={50}
              className="object-contain"
              priority
              suppressHydrationWarning
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/custom-products">Custom Product</Link>

            <form
              onSubmit={handleSearch}
              className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full"
            >
              <Search size={18} className="text-slate-600" />
              <input
                className="w-full bg-transparent outline-none placeholder-slate-600"
                type="text"
                placeholder="Search products"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                required
              />
            </form>

            <Link
              href="/cart"
              className="relative flex items-center gap-2 text-slate-600 mr-2"
            >
              <ShoppingCart size={18} />
              Cart
              <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">
                {cartCount}
              </button>
            </Link>

            {/* Control button or profile display (Desktop) */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2 cursor-pointer group relative">
                <CircleUserRound
                  size={35}
                  className="text-[#1c355e] hover:text-[#2582eb] transition-colors"
                />
                {/* Simple dropdown menu that appears on hover */}
                <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
                  <div className="bg-white border border-slate-100 shadow-lg rounded-xl p-3 w-40 text-sm flex flex-col gap-2">
                    <p className="hover:text-[#2582eb] cursor-pointer border-b pb-2">
                      My Profile
                    </p>
                    <Link href="/orders" className="hover:text-[#2582eb] cursor-pointer border-b pb-2 block">
                      Orders
                    </Link>
                    <p
                      onClick={() => setIsLoggedIn(false)}
                      className="text-red-500 hover:font-bold cursor-pointer"
                    >
                      Logout
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-2 bg-[#99b5fd] hover:bg-[#2582eb] transition text-white rounded-full font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-6 py-2 bg-[#1c355e] hover:bg-[#2582eb] transition text-white rounded-full font-medium shadow-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="sm:hidden flex items-center gap-3">
            {isLoggedIn ? (
              <CircleUserRound
                onClick={() => router.push("/profile")}
                size={30}
                className="text-[#1c355e]"
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/login")}
                  className="px-5 py-1.5 bg-[#99b5fd] text-sm text-white rounded-full"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-5 py-1.5 bg-[#1c355e] text-sm text-white rounded-full"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <hr className="border-gray-300" />
    </nav>
  );
};

export default Navbar;
