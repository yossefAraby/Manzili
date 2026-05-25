"use client";

import { categories } from "@/assets/assets";
import { FilterIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

const ownershipOptions = [
  { value: "all", label: "Open Requests" },
  { value: "mine", label: "My Requests" },
];

export default function CustomFilters({
  onOwnershipChange,
  onCategoryChange,
  onClearFilters,
  onSortChange,
}) {
  const [selectedOwnership, setSelectedOwnership] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState("latest");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleOwnershipSelect = (ownership) => {
    setSelectedOwnership(ownership);
    onOwnershipChange?.(ownership);
  };

  const handleCategoryToggle = (category) => {
    const newSelected = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(newSelected);
    onCategoryChange?.(newSelected);
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    onSortChange?.(val);
  };

  const clearFilters = () => {
    setSelectedOwnership("all");
    setSelectedCategories([]);
    setSortBy("latest");
    onOwnershipChange?.("all");
    onCategoryChange?.([]);
    onSortChange?.("latest");
    onClearFilters?.();
  };

  const hasActiveFilters =
    selectedOwnership !== "all" ||
    selectedCategories.length > 0 ||
    sortBy !== "latest";
  const activeFilterCount =
    (selectedOwnership !== "all" ? 1 : 0) +
    selectedCategories.length +
    (sortBy !== "latest" ? 1 : 0);

  const filterBody = (
    <div className="px-5 lg:px-0 pb-4 pt-4 lg:pt-0">
      {/* Sort By */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">Sort By</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "latest", label: "Latest" },
            { value: "oldest", label: "Oldest First" },
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

      {/* Categories */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">Categories</h4>
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

      {/* Ownership */}
      <div className="mb-8">
        <h4 className="font-medium text-slate-700 mb-3">Show</h4>
        <div className="flex flex-wrap gap-2">
          {ownershipOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOwnershipSelect(option.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                selectedOwnership === option.value
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600 mb-2">Active filters:</p>
          <div className="flex flex-wrap gap-2">
            {sortBy !== "latest" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Oldest First
              </span>
            )}
            {selectedOwnership !== "all" && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {
                  ownershipOptions.find((v) => v.value === selectedOwnership)
                    ?.label
                }
              </span>
            )}
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {cat}
              </span>
            ))}
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
        Filters
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
          aria-label="Filters"
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FilterIcon size={20} />
              Filters
            </h3>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close filters"
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
              Clear
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex-1 py-2.5 rounded-full bg-[#1c355e] hover:bg-[#2582eb] text-white font-medium transition-colors"
            >
              Show results
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-full p-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FilterIcon size={20} />
            Filters
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          )}
        </div>
        {filterBody}
      </div>
    </>
  );
}
