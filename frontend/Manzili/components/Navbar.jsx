"use client";
import { ShoppingCart, CircleUserRound, Star, MenuIcon, XIcon, HomeIcon, StoreIcon, PaletteIcon, LogOutIcon, UserIcon, PackageIcon, WalletIcon, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearSession, selectIsLoggedIn, selectIsSeller, selectAuthBootstrapped } from "@/lib/features/auth/authSlice";
import { setAddressList } from "@/lib/features/address/addressSlice";
import { clearCart } from "@/lib/features/cart/cartSlice";
import { hydrateWishlist, clearWishlist } from "@/lib/features/wishlist/wishlistSlice";
import { apiLogout } from "@/lib/api/auth";
import AiSearchBox from "./AiSearchBox";
import NotificationBell from "./NotificationBell";
import { useLocale, useTranslate } from "@/lib/i18n/LocaleContext";

const Navbar = () => {
  const t = useTranslate();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const dispatch = useDispatch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const cartCount = useSelector((state) => state.cart.total);
  const wishlistCount = useSelector((state) => state.wishlist.total);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const isSeller = useSelector(selectIsSeller);
  const userImage = useSelector((state) => state.auth.session?.image);
  // Whether the cookie session has been probed yet. Until it has, we DON'T show the
  // login/sign-up CTA — otherwise a logged-in user sees a "logged out" flash while
  // GET /auth/me is still in flight on first load. It lives in the persistent root store,
  // so crossing layouts (storefront ↔ dashboard) doesn't reset it either.
  const bootstrapped = useSelector(selectAuthBootstrapped);

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

  const toggleMobileSearch = () => setMobileSearchOpen((prev) => !prev);

  return (
    <nav className="relative bg-white">
      <div className="mx-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">

          {/* Logo — image-only on mobile/tablet, full wordmark on desktop */}
          <Link
            href="/"
            className="flex items-center gap-3 relative text-5xl font-bold font-sans shrink-0"
          >
            {/* Wordmark shows only on desktop (lg+). On mobile/tablet just the image logo,
                so the bar stays compact and leaves room for the search. */}
            <div className="relative hidden lg:flex items-baseline">
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

          {/* Mobile/tablet AI search — expands inline when toggled (same AI search as desktop) */}
          {mobileSearchOpen && (
            <div className="lg:hidden flex-1 mx-3">
              <AiSearchBox autoFocus onNavigate={() => setMobileSearchOpen(false)} />
            </div>
          )}

          {/* Desktop Menu (lg+). Below lg the mobile cluster + expandable search take over. */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-8 text-slate-600">
            <Link href="/">{t('navbar.home')}</Link>
            <Link href="/shop">{t('navbar.shop')}</Link>
            <Link href="/custom">{t('navbar.customProduct')}</Link>

            {/* The search IS the AI search — always on, no toggle. */}
            <div className="w-56 xl:w-72">
              <AiSearchBox />
            </div>

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

            {/* Desktop user profile dropdown. Until the cookie probe resolves, show a neutral
                placeholder (not the login/sign-up CTA) so a logged-in user never flashes "logged out". */}
            {!bootstrapped ? (
              <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" aria-hidden="true" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-2 cursor-pointer group relative">
                {mounted && userImage ? (
                  <Image
                    src={userImage}
                    alt={t('navbar.profile')}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 hover:border-[#2582eb] transition-colors"
                    suppressHydrationWarning
                  />
                ) : (
                  <CircleUserRound
                    size={35}
                    className="text-[#1c355e] hover:text-[#2582eb] transition-colors"
                  />
                )}
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

          {/* Mobile/tablet quick-access icons (below lg) */}
          <div className="lg:hidden flex items-center gap-2">
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

      {/* Mobile/tablet drawer + backdrop (below lg) */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-opacity ${
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

          <div className="mx-5 mt-4">
            <AiSearchBox onNavigate={closeMobile} />
          </div>

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
            {!bootstrapped ? null : isLoggedIn ? (
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
