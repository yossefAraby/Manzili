"use client";
import { Search, ShoppingCart, CircleUserRound, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearSession } from "@/lib/features/auth/authSlice";
import { setAddressList } from "@/lib/features/address/addressSlice";
import { persistAuthSession } from "@/lib/services/localStateBootstrap";

const Navbar = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const cartCount = useSelector((state) => state.cart.total);
  const wishlistCount = useSelector((state) => state.wishlist.total);
  const session = useSelector((state) => state.auth.session);
  const isLoggedIn = Boolean(session?.userId);

  const handleLogout = () => {
    persistAuthSession(null);
    dispatch(clearSession());
    dispatch(setAddressList([]));
    router.push("/");
  };

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
                suppressHydrationWarning
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

            <Link
              href="/wishlist"
              className="relative flex items-center gap-2 text-slate-600"
              aria-label="Wishlist"
            >
              <Star size={18} />
              <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">
                {wishlistCount}
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
                    <Link href="/profile" className="hover:text-[#2582eb] border-b pb-2 block">
                      Profile
                    </Link>
                    <Link href="/orders" className="hover:text-[#2582eb] cursor-pointer border-b pb-2 block">
                      Orders
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-left text-red-500 hover:font-semibold cursor-pointer"
                    >
                      Logout
                    </button>
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
            <Link href="/wishlist" className="relative text-slate-700" aria-label="Wishlist">
              <Star size={20} />
              <span className="absolute -top-1 -right-1 text-[8px] text-white bg-slate-600 size-3.5 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            </Link>
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
