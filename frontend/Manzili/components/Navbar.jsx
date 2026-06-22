"use client";
import { Search, ShoppingCart, CircleUserRound, Star, MenuIcon, XIcon, HomeIcon, StoreIcon, PaletteIcon, LogOutIcon, UserIcon, PackageIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearSession, selectIsLoggedIn, selectIsSeller } from "@/lib/features/auth/authSlice";
import { setAddressList } from "@/lib/features/address/addressSlice";
import { clearCart } from "@/lib/features/cart/cartSlice";
import { hydrateWishlist, clearWishlist } from "@/lib/features/wishlist/wishlistSlice";
import { apiLogout } from "@/lib/api/auth";
import NotificationBell from "./NotificationBell";
import { useLocale, useTranslate } from "@/lib/i18n/LocaleContext";

const Navbar = () => {
  const t = useTranslate();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef(null);

  const cartCount = useSelector((state) => state.cart.total);
  const wishlistCount = useSelector((state) => state.wishlist.total);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isSeller = useSelector(selectIsSeller);

  // Auth/cart state is bootstrapped from localStorage on the client, so it is
  // unavailable during SSR. Render the logged-out shell on the server and the
  // first client paint (matching the server HTML), then reveal the real state
  // after mount — this avoids a hydration mismatch in the auth-dependent UI.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const loggedIn = mounted && isLoggedIn;
  const seller = mounted && isSeller;

  // Keep the wishlist count (badge) in sync with the server: hydrate when logged in,
  // clear locally on logout. Fail safe — hydrateWishlist returns [] for guests / on error.
  useEffect(() => {
    if (isLoggedIn) dispatch(hydrateWishlist());
    else dispatch(clearWishlist());
  }, [isLoggedIn, dispatch]);

  // Body scroll-lock while the drawer is up.
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

  // Auto-focus the mobile search input when expanded
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  const closeMobile = () => setMobileMenuOpen(false);
  const navigate = (path) => {
    closeMobile();
    router.push(path);
  };

  const handleLogout = () => {
    apiLogout(); // clears the auth cookies server-side (fire-and-forget)
    dispatch(clearSession());
    dispatch(setAddressList([]));
    // The cart is browser-global; clear it on logout so the next account that
    // logs in on this browser doesn't inherit the previous user's items.
    dispatch(clearCart());
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
    setMobileSearchOpen(false);
    closeMobile();
    router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
  };

  const handleMobileSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setMobileSearchOpen(false);
    }
  };

  const toggleMobileSearch = () => {
    setMobileSearchOpen((prev) => {
      if (!prev) setSearch("");
      return !prev;
    });
  };

  return (
    <nav className="relative bg-white">
      <div className="mx-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">

          {/* Logo — shrinks to image-only when mobile search is open */}
          <Link
            href="/"
            className="flex items-center gap-3 relative text-5xl font-bold font-sans shrink-0"
          >
            {/* Text part fades out on mobile when search is open */}
            <div
              className={`relative flex items-baseline transition-all duration-300 ease-in-out sm:flex ${
                mobileSearchOpen ? "hidden" : "flex"
              }`}
            >
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

          {/* Mobile search bar — expands inline when toggled */}
          {mobileSearchOpen && (
            <form
              onSubmit={handleMobileSearch}
              className="sm:hidden flex-1 mx-3 flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-full"
            >
              <Search size={16} className="text-slate-500 shrink-0" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleMobileSearchKeyDown}
                placeholder={t('navbar.searchProducts') + '…'}
                className="w-full bg-transparent outline-none text-sm placeholder-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label={t('navbar.clearSearch')}
                >
                  <XIcon size={14} />
                </button>
              )}
            </form>
          )}

          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
            <Link href="/">{t('navbar.home')}</Link>
            <Link href="/shop">{t('navbar.shop')}</Link>
            <Link href="/custom">{t('navbar.customProduct')}</Link>

            <form
              onSubmit={handleSearch}
              className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full"
            >
              <Search size={18} className="text-slate-600" />
              <input
                suppressHydrationWarning
                className="w-full bg-transparent outline-none placeholder-slate-600"
                type="text"
                placeholder={t('navbar.searchProducts')}
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
              {t('navbar.cart')}
              <button suppressHydrationWarning className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">
                {cartCount}
              </button>
            </Link>

            {/* Wishlist + notifications are personal — only for signed-in users. */}
            {loggedIn && (
              <>
                <Link
                  href="/wishlist"
                  className="relative flex items-center gap-2 text-slate-600"
                  aria-label={t('navbar.wishlist')}
                >
                  <Star size={18} />
                  <button suppressHydrationWarning className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">
                    {wishlistCount}
                  </button>
                </Link>

                <NotificationBell />
              </>
            )}

            {/* Desktop user profile dropdown */}
            {loggedIn ? (
              <div className="flex items-center gap-2 cursor-pointer group relative">
                <CircleUserRound
                  size={35}
                  className="text-[#1c355e] hover:text-[#2582eb] transition-colors"
                />
                {/* Dropdown on hover */}
                <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
                  <div className="bg-white border border-slate-100 shadow-lg rounded-xl p-3 w-44 text-sm flex flex-col gap-2">
                    <Link href="/profile" className="hover:text-[#2582eb] border-b pb-2 block">
                      {t('navbar.profile')}
                    </Link>
                    {seller ? (
                      <>
                        <Link href="/store" className="hover:text-[#2582eb] cursor-pointer border-b pb-2 block">
                          {t('navbar.myStore')}
                        </Link>
                        <Link href="/store/wallet" className="hover:text-[#2582eb] cursor-pointer border-b pb-2 flex items-center gap-2">
                          <WalletIcon size={14} />
                          {t('navbar.myWallet')}
                        </Link>
                      </>
                    ) : (
                      <Link href="/orders" className="hover:text-[#2582eb] cursor-pointer border-b pb-2 block">
                        {t('navbar.orders')}
                      </Link>
                    )}
                    {/* Language toggle */}
                    <div className="border-b pb-2">
                      <p className="text-xs text-slate-400 mb-1">{t('navbar.language')}</p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setLocale('en')}
                          className={`flex-1 text-xs py-1 rounded-md transition ${
                            locale === 'en'
                              ? 'bg-[#2582eb] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t('navbar.english')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocale('ar')}
                          className={`flex-1 text-xs py-1 rounded-md transition ${
                            locale === 'ar'
                              ? 'bg-[#2582eb] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t('navbar.arabic')}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-left text-red-500 hover:font-semibold cursor-pointer"
                    >
                      {t('navbar.logout')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Language toggle for logged-out */}
                <div className="flex items-center border border-slate-200 rounded-full overflow-hidden text-xs mr-1">
                  <button
                    type="button"
                    onClick={() => setLocale('en')}
                    className={`px-2 py-1 transition ${
                      locale === 'en' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale('ar')}
                    className={`px-2 py-1 transition ${
                      locale === 'ar' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    AR
                  </button>
                </div>
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-2 bg-[#99b5fd] hover:bg-[#2582eb] transition text-white rounded-full font-medium"
                >
                  {t('navbar.login')}
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-6 py-2 bg-[#1c355e] hover:bg-[#2582eb] transition text-white rounded-full font-medium shadow-sm"
                >
                  {t('navbar.signUp')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile quick-access icons */}
          <div className="sm:hidden flex items-center gap-2">
            {/* Search toggle — replaces wishlist on mobile bar */}
            <button
              type="button"
              onClick={toggleMobileSearch}
              aria-label={mobileSearchOpen ? t('navbar.closeSearch') : t('navbar.openSearch')}
              aria-expanded={mobileSearchOpen}
              className={`p-1.5 transition-colors ${
                mobileSearchOpen
                  ? "text-[#2582eb]"
                  : "text-slate-700"
              }`}
            >
              {mobileSearchOpen ? <XIcon size={22} /> : <Search size={22} />}
            </button>

            <Link
              href="/cart"
              className="relative text-slate-700 p-1.5"
              aria-label={t('navbar.cart')}
            >
              <ShoppingCart size={22} />
              {mounted && cartCount > 0 && (
                <span className="absolute top-0 right-0 text-[9px] text-white bg-[#e67e22] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Link>
            {loggedIn && <NotificationBell compact />}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t('navbar.openMenu')}
              aria-expanded={mobileMenuOpen}
              className="p-1.5 text-slate-700 active:scale-95 transition-transform"
            >
              <MenuIcon size={26} />
            </button>
          </div>
        </div>
      </div>
      <hr className="border-gray-300" />

      {/* Mobile drawer + backdrop */}
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
          aria-label={t('navbar.mobileMenu')}
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
              aria-label={t('navbar.closeMenu')}
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
              placeholder={t('navbar.searchProducts')}
              className="w-full bg-transparent outline-none text-sm placeholder-slate-500"
            />
          </form>

          <nav className="flex flex-col mt-4 px-2">
            <MobileLink onClick={() => navigate("/")} icon={HomeIcon} label={t('navbar.home')} />
            <MobileLink onClick={() => navigate("/shop")} icon={StoreIcon} label={t('navbar.shop')} />
            <MobileLink onClick={() => navigate("/custom")} icon={PaletteIcon} label={t('navbar.customProduct')} />
            {loggedIn && (
              <MobileLink
                onClick={() => navigate("/wishlist")}
                icon={Star}
                label={t('navbar.wishlist')}
                badge={wishlistCount}
              />
            )}
            <MobileLink
              onClick={() => navigate("/cart")}
              icon={ShoppingCart}
              label={t('navbar.cart')}
              badge={mounted ? cartCount : 0}
            />
            {/* Mobile language toggle */}
            <div className="flex items-center gap-2 px-3 py-3">
              <span className="text-xs text-slate-400">{t('navbar.language')}:</span>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`text-xs px-2 py-1 rounded ${
                  locale === 'en' ? 'bg-[#2582eb] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t('navbar.english')}
              </button>
              <button
                type="button"
                onClick={() => setLocale('ar')}
                className={`text-xs px-2 py-1 rounded ${
                  locale === 'ar' ? 'bg-[#2582eb] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t('navbar.arabic')}
              </button>
            </div>
            {loggedIn && (
              <>
                <div className="my-2 border-t border-slate-100 mx-3" />
                <MobileLink onClick={() => navigate("/profile")} icon={UserIcon} label={t('navbar.profile')} />
                {seller ? (
                  <>
                    <MobileLink onClick={() => navigate("/store")} icon={StoreIcon} label={t('navbar.myStore')} />
                    <MobileLink onClick={() => navigate("/store/wallet")} icon={WalletIcon} label={t('navbar.myWallet')} />
                  </>
                ) : (
                  <MobileLink onClick={() => navigate("/orders")} icon={PackageIcon} label={t('navbar.orders')} />
                )}
              </>
            )}
          </nav>

          <div className="mt-auto px-5 py-4 border-t border-slate-100">
            {loggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 text-red-500 font-medium py-2.5 rounded-full border border-red-200 hover:bg-red-50 transition-colors"
              >
                <LogOutIcon size={16} />
                {t('navbar.logOut')}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex-1 py-2.5 bg-[#99b5fd] hover:bg-[#2582eb] text-white rounded-full font-medium transition-colors"
                >
                  {t('navbar.login')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="flex-1 py-2.5 bg-[#1c355e] hover:bg-[#2582eb] text-white rounded-full font-medium transition-colors"
                >
                  {t('navbar.signUp')}
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
