"use client";
import { Search, ShoppingCart, CircleUserRound, Star, MenuIcon, XIcon, HomeIcon, StoreIcon, PaletteIcon, LogOutIcon, UserIcon, PackageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearSession, selectIsLoggedIn, selectIsSeller } from "@/lib/features/auth/authSlice";
import { setAddressList } from "@/lib/features/address/addressSlice";
import { persistAuthSession } from "@/lib/services/localStateBootstrap";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  // Mobile-only side drawer. Anchored to `mobileMenuOpen` so the same
  // state drives the slide-in transform, the body-scroll lock, and the
  // backdrop click-to-close.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = useSelector((state) => state.cart.total);
  const wishlistCount = useSelector((state) => state.wishlist.total);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isSeller = useSelector(selectIsSeller);

  // Body scroll-lock while the drawer is up. Without this, swiping inside
  // the drawer pulls the page underneath along for the ride on iOS.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [mobileMenuOpen]);

  const closeMobile = () => setMobileMenuOpen(false);
  const navigate = (path) => {
    closeMobile();
    router.push(path);
  };

  const handleLogout = () => {
    persistAuthSession(null);
    dispatch(clearSession());
    dispatch(setAddressList([]));
    closeMobile();
    router.push("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    router.push(`/shop?search=${search}`);
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    closeMobile();
    router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
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
            <Link href="/custom">Custom Product</Link>

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

            <NotificationBell />

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
                    {isSeller ? (
                      <Link href="/store" className="hover:text-[#2582eb] cursor-pointer border-b pb-2 block">
                        My Store
                      </Link>
                    ) : (
                      <Link href="/orders" className="hover:text-[#2582eb] cursor-pointer border-b pb-2 block">
                        Orders
                      </Link>
                    )}
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

          {/* Mobile Menu — quick-access icons on the bar, full nav lives
              in the slide-in drawer triggered by the hamburger. */}
          <div className="sm:hidden flex items-center gap-2">
            <Link
              href="/cart"
              className="relative text-slate-700 p-1.5"
              aria-label="Cart"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 text-[9px] text-white bg-[#e67e22] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>
            <NotificationBell compact />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              className="p-1.5 text-slate-700 active:scale-95 transition-transform"
            >
              <MenuIcon size={26} />
            </button>
          </div>
        </div>
      </div>
      <hr className="border-gray-300" />

      {/* Mobile drawer + backdrop. Lives outside the nav row so the slide
          transform isn't constrained by `mx-6`. Backdrop fades and the
          panel slides from the right. */}
      <div
        className={`sm:hidden fixed inset-0 z-[60] transition-opacity ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          onClick={closeMobile}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <aside
          className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label="Main menu"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <Link href="/" onClick={closeMobile} className="flex items-baseline text-2xl font-bold">
              <span className="text-[#1c355e]">M</span>
              <span className="bg-gradient-to-b from-[#e3cda8] to-[#aa804c] text-transparent bg-clip-text">
                anzili
              </span>
            </Link>
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close menu"
              className="p-1.5 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
            >
              <XIcon size={24} />
            </button>
          </div>

          <form
            onSubmit={handleMobileSearch}
            className="mx-5 mt-4 flex items-center gap-2 bg-slate-100 px-4 py-2.5 rounded-full"
          >
            <Search size={18} className="text-slate-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="w-full bg-transparent outline-none text-sm placeholder-slate-500"
            />
          </form>

          <nav className="flex flex-col mt-4 px-2">
            <MobileLink onClick={() => navigate("/")} icon={HomeIcon} label="Home" />
            <MobileLink onClick={() => navigate("/shop")} icon={StoreIcon} label="Shop" />
            <MobileLink onClick={() => navigate("/custom")} icon={PaletteIcon} label="Custom Product" />
            <MobileLink
              onClick={() => navigate("/wishlist")}
              icon={Star}
              label="Wishlist"
              badge={wishlistCount}
            />
            <MobileLink
              onClick={() => navigate("/cart")}
              icon={ShoppingCart}
              label="Cart"
              badge={cartCount}
            />
            {isLoggedIn && (
              <>
                <div className="my-2 border-t border-slate-100 mx-3" />
                <MobileLink onClick={() => navigate("/profile")} icon={UserIcon} label="Profile" />
                {isSeller ? (
                  <MobileLink onClick={() => navigate("/store")} icon={StoreIcon} label="My Store" />
                ) : (
                  <MobileLink onClick={() => navigate("/orders")} icon={PackageIcon} label="Orders" />
                )}
              </>
            )}
          </nav>

          <div className="mt-auto px-5 py-4 border-t border-slate-100">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 text-red-500 font-medium py-2.5 rounded-full border border-red-200 hover:bg-red-50 transition-colors"
              >
                <LogOutIcon size={16} />
                Log out
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex-1 py-2.5 bg-[#99b5fd] hover:bg-[#2582eb] text-white rounded-full font-medium transition-colors"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="flex-1 py-2.5 bg-[#1c355e] hover:bg-[#2582eb] text-white rounded-full font-medium transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </nav>
  );
};

function MobileLink({ onClick, icon: Icon, label, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
    >
      <Icon size={20} className="text-slate-500 shrink-0" />
      <span className="font-medium flex-1">{label}</span>
      {Number(badge) > 0 && (
        <span className="text-[10px] font-semibold bg-[#e67e22] text-white min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

export default Navbar;
