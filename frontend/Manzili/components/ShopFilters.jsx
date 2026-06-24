"use client";

import { categories } from "@/assets/assets";
import { FilterIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrencySymbol } from "@/lib/currency";
import { useTranslate } from "@/lib/i18n/LocaleContext";
import { fetchProductCities } from "@/lib/api/products";

const currencySym = getCurrencySymbol();
const MIN_PRICE = 0;
const MAX_PRICE = 1500;

export default function ShopFilters({
  onCategoryChange,
  onPriceRangeChange,
  onSortChange,
  onAvailabilityChange,
  onCityChange,
  initialCategories = [],
}) {
  const t = useTranslate();
  const priceRanges = [
    { label: `${t("shopFilters.underPrice", { price: 200 })} ${currencySym}`, min: 0, max: 200 },
    { label: `200 - 400 ${currencySym}`, min: 200, max: 400 },
    { label: `400 - 600 ${currencySym}`, min: 400, max: 600 },
    { label: `600 - 1000 ${currencySym}`, min: 600, max: 1000 },
    { label: `Over 1000 ${currencySym}`, min: 1000, max: Infinity },
  ];
  const [selectedCategories, setSelectedCategories] =
    useState(initialCategories);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [sliderMax, setSliderMax] = useState(MAX_PRICE);
  const [sortBy, setSortBy] = useState("latest");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load cities that actually have active stores (for the location filter dropdown).
  useEffect(() => {
    let alive = true;
    fetchProductCities().then((list) => { if (alive) setCities(Array.isArray(list) ? list : []); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleCategoryToggle = (category) => {
    const newSelected = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newSelected);
    onCategoryChange?.(newSelected);
  };

  const handlePriceRangeSelect = (range) => {
    const newRange = selectedPriceRange?.label === range.label ? null : range;
    setSelectedPriceRange(newRange);
    setSliderMax(MAX_PRICE);
    onPriceRangeChange?.(newRange);
  };

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setSliderMax(value);
    setSelectedPriceRange(null);
    if (value === MAX_PRICE) {
      onPriceRangeChange?.(null);
    } else {
      const customRange = {
        label: `${t("shopFilters.underPrice", { price: value })} ${currencySym}`,
        min: MIN_PRICE,
        max: value,
      };
      onPriceRangeChange?.(customRange);
    }
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    onSortChange?.(val);
  };
  const handleStockChange = (val) => {
    setStockFilter(val);
    onAvailabilityChange?.(val);
  };
  const handleCityChange = (val) => {
    setSelectedCity(val);
    onCityChange?.(val);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPriceRange(null);
    setSliderMax(MAX_PRICE);
    setSortBy("latest");
    setStockFilter("all");
    setSelectedCity("");
    onCategoryChange?.([]);
    onPriceRangeChange?.(null);
    onSortChange?.("latest");
    onAvailabilityChange?.("all");
    onCityChange?.("");
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedPriceRange ||
    sliderMax !== MAX_PRICE ||
    sortBy !== "latest" ||
    stockFilter !== "all" ||
    Boolean(selectedCity);

  const activeFilterCount =
    selectedCategories.length +
    (selectedPriceRange ? 1 : 0) +
    (sliderMax !== MAX_PRICE && !selectedPriceRange ? 1 : 0) +
    (sortBy !== "latest" ? 1 : 0) +
    (stockFilter !== "all" ? 1 : 0) +
    (selectedCity ? 1 : 0);

  const filterBody = (
    <div className="px-5 lg:px-0 pb-4 pt-4 lg:pt-0">
      {/* Sort By */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">{t("shopFilters.sortBy")}</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "latest", label: t("shopFilters.latest") },
            { value: "popular", label: t("shopFilters.popular") },
            { value: "reviews", label: t("shopFilters.reviews") },
            { value: "nearest", label: t("shopFilters.nearest") },
            { value: "price_asc", label: t("shopFilters.priceLowToHigh") },
            { value: "price_desc", label: t("shopFilters.priceHighToLow") },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSortChange(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                sortBy === opt.value
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">{t("shopFilters.availability")}</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: t("shopFilters.all") },
            { value: "inStock", label: t("shopFilters.inStock") },
            { value: "outOfStock", label: t("shopFilters.outOfStock") },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStockChange(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                stockFilter === opt.value
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location (city) */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">{t("shopFilters.location")}</h4>
        <select
          value={selectedCity}
          onChange={(e) => handleCityChange(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-[#e67e22]"
        >
          <option value="">{t("shopFilters.allCities")}</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">{t("shopFilters.categories")}</h4>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryToggle(cat)}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                selectedCategories.includes(cat)
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">{t("shopFilters.priceRange")}</h4>
        {/* Slider */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>{t("shopFilters.maxPrice", { price: `${getCurrencySymbol()} ${sliderMax}` })}</span>
            <span>{t("shopFilters.priceRangeFormat", { min: `${getCurrencySymbol()} ${MIN_PRICE}`, max: `${getCurrencySymbol()} ${MAX_PRICE}` })}</span>
          </div>
          <input
            type="range"
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={10}
            value={sliderMax}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
          />
        </div>
        {/* Predefined ranges */}
        <div className="flex flex-wrap gap-2">
          {priceRanges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => handlePriceRangeSelect(range)}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                selectedPriceRange?.label === range.label
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600 mb-2">{t("shopFilters.activeFilters")}</p>
          <div className="flex flex-wrap gap-2">
            {sortBy !== "latest" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {sortBy === "price_asc" ? t("shopFilters.priceLowToHigh")
                  : sortBy === "price_desc" ? t("shopFilters.priceHighToLow")
                  : sortBy === "popular" ? t("shopFilters.popular")
                  : sortBy === "reviews" ? t("shopFilters.reviews")
                  : sortBy}
              </span>
            )}
            {stockFilter !== "all" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {stockFilter === "inStock" ? t("shopFilters.inStock") : t("shopFilters.outOfStock")}
              </span>
            )}
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {cat}
              </span>
            ))}
            {selectedPriceRange && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {selectedPriceRange.label}
              </span>
            )}
            {sliderMax !== MAX_PRICE && !selectedPriceRange && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {t("shopFilters.underPrice", { price: sliderMax })} {currencySym}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden mb-4 inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
      >
        <FilterIcon size={16} />
        {t("shopFilters.filters")}
        {activeFilterCount > 0 && (
          <span className="inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center bg-[#e67e22] text-white rounded-full text-[11px] font-semibold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-opacity ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <div
          role="dialog"
          aria-label={t("shopFilters.filters")}
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FilterIcon size={20} />
              {t("shopFilters.filters")}
            </h3>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t("shopFilters.closeFilters")}
              className="p-1.5 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"
            >
              <XIcon size={22} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">{filterBody}</div>
          <div className="border-t border-slate-100 px-5 py-3 flex gap-2 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              {t("shopFilters.clear")}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex-1 py-2.5 rounded-full bg-[#1c355e] hover:bg-[#2582eb] text-white font-medium transition-colors"
            >
              {t("shopFilters.showResults")}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-full p-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FilterIcon size={20} />
            {t("shopFilters.filters")}
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {t("shopFilters.clearAll")}
            </button>
          )}
        </div>
        {filterBody}
      </div>
    </>
  );
}
