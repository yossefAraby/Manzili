'use client'

import { categories } from '@/assets/assets'
import { FilterIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

const ownershipOptions = [
  { value: 'all', label: 'Open Requests' },
  { value: 'mine', label: 'My Requests' },
]

export default function CustomFilters({
  onOwnershipChange,
  onCategoryChange,
  onClearFilters
}) {
    const [selectedOwnership, setSelectedOwnership] = useState('all')
    const [selectedCategories, setSelectedCategories] = useState([])
    // Mobile-only: drawer is collapsed by default. On lg+ the panel
    // renders inline (sidebar) regardless of this flag — `lg:!block`
    // overrides the closed state at desktop widths.
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        if (typeof document === 'undefined') return undefined
        if (!mobileOpen) return undefined
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [mobileOpen])

    const handleOwnershipSelect = (ownership) => {
        setSelectedOwnership(ownership)
        onOwnershipChange?.(ownership)
    }

    const handleCategoryToggle = (category) => {
        const newSelected = selectedCategories.includes(category)
            ? selectedCategories.filter(c => c !== category)
            : [...selectedCategories, category]
        setSelectedCategories(newSelected)
        onCategoryChange?.(newSelected)
    }

    const clearFilters = () => {
        setSelectedOwnership('all')
        setSelectedCategories([])
        onOwnershipChange?.('all')
        onCategoryChange?.([])
        onClearFilters?.()
    }

    const hasActiveFilters = selectedOwnership !== 'all' || selectedCategories.length > 0
    const activeFilterCount =
        (selectedOwnership !== 'all' ? 1 : 0) + selectedCategories.length

    return (
        <>
            {/* Mobile-only trigger pill. Stays out of the way at lg+ where
                the desktop sidebar handles everything. */}
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

            {/* Mobile backdrop — single overlay that hosts the bottom-sheet
                panel below. Hidden on lg where the inline sidebar takes
                over. */}
            <div
                className={`lg:hidden fixed inset-0 z-[60] transition-opacity ${
                    mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                aria-hidden={!mobileOpen}
            >
                <div onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                <div
                    role="dialog"
                    aria-label="Filters"
                    className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl transition-transform duration-300 ${
                        mobileOpen ? 'translate-y-0' : 'translate-y-full'
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
                    <div className="overflow-y-auto flex-1">
                        <FilterBody
                            categories={categories}
                            selectedCategories={selectedCategories}
                            handleCategoryToggle={handleCategoryToggle}
                            selectedOwnership={selectedOwnership}
                            handleOwnershipSelect={handleOwnershipSelect}
                            hasActiveFilters={hasActiveFilters}
                        />
                    </div>
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

            {/* Desktop sidebar — unchanged layout from before. */}
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
                <FilterBody
                    categories={categories}
                    selectedCategories={selectedCategories}
                    handleCategoryToggle={handleCategoryToggle}
                    selectedOwnership={selectedOwnership}
                    handleOwnershipSelect={handleOwnershipSelect}
                    hasActiveFilters={hasActiveFilters}
                />
            </div>
        </>
    )
}

// Renders the body of the filter panel — extracted so the same markup
// runs inside the desktop sidebar and the mobile bottom-sheet without
// duplicating the radio/checkbox plumbing.
function FilterBody({
    categories,
    selectedCategories,
    handleCategoryToggle,
    selectedOwnership,
    handleOwnershipSelect,
    hasActiveFilters,
}) {
    return (
        <div className="px-5 lg:px-0 pb-4 pt-4 lg:pt-0">
            {/* Categories Section */}
            <div className="mb-8">
                <h4 className="font-medium text-slate-700 mb-4">Categories</h4>
                <div className="space-y-3">
                    {categories.map((cat) => (
                        <label key={cat} className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat)}
                                onChange={() => handleCategoryToggle(cat)}
                                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-slate-700">{cat}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Ownership Section */}
            <div className="mb-8">
                <h4 className="font-medium text-slate-700 mb-4">Show</h4>
                <div className="space-y-3">
                    {ownershipOptions.map((option) => (
                        <label key={option.value} className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="ownership"
                                checked={selectedOwnership === option.value}
                                onChange={() => handleOwnershipSelect(option.value)}
                                className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-slate-700">
                                {option.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Active filters summary */}
            {hasActiveFilters && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-2">Active filters:</p>
                    <div className="flex flex-wrap gap-2">
                        {selectedOwnership !== 'all' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {ownershipOptions.find(v => v.value === selectedOwnership)?.label}
                            </span>
                        )}
                        {selectedCategories.map(cat => (
                            <span key={cat} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}