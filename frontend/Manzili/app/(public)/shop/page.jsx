"use client";
import { Suspense, useState, useMemo, useEffect, useCallback, useRef } from "react";
import ProductCard from "@/components/ProductCard";
import ShopFilters from "@/components/ShopFilters";
import Pagination from "@/components/Pagination";
import { MoveLeftIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts as warmCatalog } from "@/lib/features/product/productSlice";
import { fetchProducts as fetchProductsApi } from "@/lib/api/products";
import { useTranslate } from '@/lib/i18n/LocaleContext'

// 12 products per page; each page loads its OWN slice from the DB (server-side pagination).
// The page number lives in the URL (?page=N) so it's shareable and the browser back/forward
// buttons move between pages.
const PAGE_SIZE = 12;

// Map the ShopFilters sort value onto the backend's sortBy/sortDir params.
function sortParams(sortBy) {
  switch (sortBy) {
    case "price_asc": return { sortBy: "price", sortDir: "asc" };
    case "price_desc": return { sortBy: "price", sortDir: "desc" };
    case "popular": return { sortBy: "popular", sortDir: "desc" };   // most-viewed
    case "reviews": return { sortBy: "reviews", sortDir: "desc" };   // most-reviewed
    case "nearest": return { sortBy: "nearest", sortDir: "desc" };   // same-city sellers first (buyer's city, server-resolved)
    default: return { sortBy: "created_at", sortDir: "desc" }; // latest
  }
}

function ShopContent() {
  const t = useTranslate();
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const categoryParam = searchParams.get("category");
  const router = useRouter();
  const dispatch = useDispatch();

  // The current page is read straight from the URL — the single source of truth.
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  // Navigate to a page by writing ?page=N (preserving the other params). page 1 drops the param.
  const goToPage = useCallback((p) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (p <= 1) params.delete("page"); else params.set("page", String(p));
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop", { scroll: false });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router, searchParams]);

  // Keep the app-wide catalog warm once (home/cart/wishlist read state.product.list).
  const catalogStatus = useSelector((state) => state.product.status);
  useEffect(() => {
    if (catalogStatus === "idle") dispatch(warmCatalog());
  }, [dispatch, catalogStatus]);

  // Seed category filter from the URL so links like /shop?category=Woodwork land pre-filtered.
  const initialCategories = useMemo(
    () => (categoryParam ? [categoryParam] : []),
    [categoryParam],
  );

  // Filter state (the grid + page are driven off these).
  const [selectedCategories, setSelectedCategories] = useState(initialCategories);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");

  // Server-paginated results for the current page only.
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedCategories(initialCategories);
  }, [initialCategories]);

  // A new result set (filters/sort/search changed) → jump back to page 1.
  const filterKey = useMemo(
    () => JSON.stringify({
      search: search || "",
      cats: selectedCategories,
      min: selectedPriceRange?.min ?? null,
      max: Number.isFinite(selectedPriceRange?.max) ? selectedPriceRange.max : null,
      sortBy,
      stockFilter,
      city: selectedCity,
    }),
    [search, selectedCategories, selectedPriceRange, sortBy, stockFilter, selectedCity],
  );
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      if (page > 1) goToPage(1);
    }
  }, [filterKey, page, goToPage]);

  // Fetch the current page server-side. Debounced so dragging the price slider / typing doesn't
  // fire a request per tick.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      const { sortBy: apiSortBy, sortDir } = sortParams(sortBy);
      const inStock =
        stockFilter === "inStock" ? true : stockFilter === "outOfStock" ? false : undefined;
      try {
        const res = await fetchProductsApi({
          page,
          limit: PAGE_SIZE,
          category: selectedCategories.length > 0 ? selectedCategories : undefined,
          search: search || undefined,
          minPrice: selectedPriceRange?.min,
          maxPrice: Number.isFinite(selectedPriceRange?.max) ? selectedPriceRange.max : undefined,
          inStock,
          sortBy: apiSortBy,
          sortDir,
          city: selectedCity || undefined,
        });
        if (cancelled) return;
        setProducts(res.items);
        setTotal(res.total);
      } catch {
        if (cancelled) return;
        setProducts([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [search, selectedCategories, selectedPriceRange, sortBy, stockFilter, selectedCity, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A stale ?page= beyond the result set (e.g. shared link, or a filter narrowed it) → clamp.
  useEffect(() => {
    if (total > 0 && page > totalPages) goToPage(totalPages);
  }, [total, totalPages, page, goToPage]);

  return (
    <div className="min-h-[70vh] mx-6">
      <div className="max-w-7xl mx-auto">
        <h1
          onClick={() => router.push("/shop")}
          className="text-2xl text-slate-500 my-6 flex items-center gap-2 cursor-pointer"
        >
          {search && <MoveLeftIcon size={20} />}
          {t('shop.title')}
        </h1>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-12">
          <div className="lg:order-2 lg:w-72 xl:w-80">
            <ShopFilters
              key={initialCategories.join("|")}
              initialCategories={initialCategories}
              onCategoryChange={setSelectedCategories}
              onPriceRangeChange={setSelectedPriceRange}
              onSortChange={setSortBy}
              onAvailabilityChange={setStockFilter}
              onCityChange={setSelectedCity}
            />
          </div>

          <div className="lg:flex-1 lg:order-1">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 xl:gap-8">
              {loading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl bg-slate-100 aspect-[3/4]" />
                ))
              ) : products.length > 0 ? (
                products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-slate-500 text-lg">{t('shop.noProductsMatch')}</p>
                </div>
              )}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onChange={goToPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-400 text-sm">Loading…</div>}>
      <ShopContent />
    </Suspense>
  );
}
