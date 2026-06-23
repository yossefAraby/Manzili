"use client";
import { Suspense, useState, useMemo, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import ShopFilters from "@/components/ShopFilters";
import Pagination from "@/components/Pagination";
import { MoveLeftIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts as warmCatalog } from "@/lib/features/product/productSlice";
import { fetchProducts as fetchProductsApi } from "@/lib/api/products";
import { useTranslate } from '@/lib/i18n/LocaleContext'

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;

// Map the ShopFilters sort value onto the backend's sortBy/sortDir params.
function sortParams(sortBy) {
  switch (sortBy) {
    case "price_asc": return { sortBy: "price", sortDir: "asc" };
    case "price_desc": return { sortBy: "price", sortDir: "desc" };
    default: return { sortBy: "created_at", sortDir: "desc" }; // latest
  }
}

function ShopContent() {
  const t = useTranslate();
  // get query params ?search=abc&category=Woodwork
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const categoryParam = searchParams.get("category");
  const router = useRouter();
  const dispatch = useDispatch();

  // Keep the app-wide catalog warm once (home/cart/wishlist read state.product.list).
  // This is a single background fetch — the shop grid itself paginates server-side below.
  const catalogStatus = useSelector((state) => state.product.status);
  useEffect(() => {
    if (catalogStatus === "idle") dispatch(warmCatalog());
  }, [dispatch, catalogStatus]);

  // Seed category filter from the URL so links like /shop?category=Woodwork
  // (from CategoriesMarquee) land on a pre-filtered grid.
  const initialCategories = useMemo(
    () => (categoryParam ? [categoryParam] : []),
    [categoryParam],
  );

  // Filter + paging state
  const [selectedCategories, setSelectedCategories] = useState(initialCategories);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [stockFilter, setStockFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Server-paginated results for the current page only.
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedCategories(initialCategories);
  }, [initialCategories]);

  // Reset to page 1 whenever a filter/sort/page-size changes (a new result set).
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategories, selectedPriceRange, sortBy, stockFilter, pageSize]);

  // Fetch the current page server-side. Debounced so dragging the price slider (or
  // typing) doesn't fire a request per tick. Each page loads its own slice from the DB.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      const { sortBy: apiSortBy, sortDir } = sortParams(sortBy);
      const inStock =
        stockFilter === "inStock" ? true : stockFilter === "outOfStock" ? false : undefined;
      try {
        const res = await fetchProductsApi({
          page: currentPage,
          limit: pageSize,
          category: selectedCategories.length > 0 ? selectedCategories : undefined,
          search: search || undefined,
          minPrice: selectedPriceRange?.min,
          maxPrice:
            selectedPriceRange && Number.isFinite(selectedPriceRange.max)
              ? selectedPriceRange.max
              : undefined,
          inStock,
          sortBy: apiSortBy,
          sortDir,
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
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, selectedCategories, selectedPriceRange, sortBy, stockFilter, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp the page if the result set shrank (e.g. a filter narrowed it).
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handleCategoryChange = (categories) => setSelectedCategories(categories);
  const handlePriceRangeChange = (range) => setSelectedPriceRange(range);

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
          {/* Filters: rendered first so its mobile trigger pill
                        (and any open drawer) appear above the grid on
                        small screens. lg:order-2 swaps it back to a right
                        sidebar at desktop widths. */}
          <div className="lg:order-2 lg:w-72 xl:w-80">
            <ShopFilters
              // Re-mount when the URL category changes so the internal
              // checkbox state in ShopFilters re-seeds from initialCategories.
              key={initialCategories.join("|")}
              initialCategories={initialCategories}
              onCategoryChange={handleCategoryChange}
              onPriceRangeChange={handlePriceRangeChange}
              onSortChange={setSortBy}
              onAvailabilityChange={setStockFilter}
            />
          </div>

          {/* Products grid - left side */}
          <div className="lg:flex-1 lg:order-1">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 xl:gap-8 mb-32">
              {loading ? (
                // Lightweight skeletons sized to the page so the layout doesn't jump.
                Array.from({ length: pageSize }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl bg-slate-100 aspect-[3/4]"
                  />
                ))
              ) : products.length > 0 ? (
                products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-slate-500 text-lg">
                    {t('shop.noProductsMatch')}
                  </p>
                </div>
              )}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShopContent />
    </Suspense>
  );
}
