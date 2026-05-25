"use client";
import { Suspense, useState, useMemo, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import ShopFilters from "@/components/ShopFilters";
import Pagination from "@/components/Pagination";
import { MoveLeftIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { useTranslate } from '@/lib/i18n/LocaleContext'

function ShopContent() {
  const t = useTranslate();
  // get query params ?search=abc&category=Woodwork
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const categoryParam = searchParams.get("category");
  const router = useRouter();

  const products = useSelector((state) => state.product.list);

  // Seed category filter from the URL so links like /shop?category=Woodwork
  // (from CategoriesMarquee) land on a pre-filtered grid. We keep this
  // controllable from ShopFilters via a key reset whenever the param changes.
  const initialCategories = useMemo(
    () => (categoryParam ? [categoryParam] : []),
    [categoryParam],
  );

  // Filter states
  const [selectedCategories, setSelectedCategories] =
    useState(initialCategories);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [sortBy, setSortBy] = useState("latest");
  const [stockFilter, setStockFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setSelectedCategories(initialCategories);
  }, [initialCategories]);

  // Reset to page 1 whenever any filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategories, selectedPriceRange, sortBy, stockFilter]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (search) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const selectedLower = selectedCategories.map((c) => c.toLowerCase());
      filtered = filtered.filter((product) =>
        selectedLower.includes(product.category.toLowerCase()),
      );
    }

    // Price range filter
    if (selectedPriceRange) {
      filtered = filtered.filter((product) => {
        const price = product.price;
        const { min, max } = selectedPriceRange;
        if (max === Infinity) return price >= min;
        return price >= min && price <= max;
      });
    }

    // Availability filter
    if (stockFilter === "inStock") {
      filtered = filtered.filter((p) => {
        if (p.variants && p.variants.length > 0)
          return p.variants.some((v) => v.stock > 0);
        return p.stock > 0;
      });
    } else if (stockFilter === "outOfStock") {
      filtered = filtered.filter((p) => {
        if (p.variants && p.variants.length > 0)
          return p.variants.every((v) => v.stock === 0);
        return p.stock === 0;
      });
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      default:
        filtered = [...filtered].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
    }

    return filtered;
  }, [
    products,
    search,
    selectedCategories,
    selectedPriceRange,
    sortBy,
    stockFilter,
  ]);

  // Clamp currentPage when totalPages decreases (e.g. filtering reduces results)
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE),
  );
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages]);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleCategoryChange = (categories) => {
    setSelectedCategories(categories);
  };

  const handlePriceRangeChange = (range) => {
    setSelectedPriceRange(range);
  };

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
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((product) => (
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
