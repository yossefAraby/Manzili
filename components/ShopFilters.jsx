'use client'

import { categories } from '@/assets/assets'
import { FilterIcon } from 'lucide-react'
import { useState } from 'react'

const priceRanges = [
    { label: 'Under 200 EGP', min: 0, max: 200 },
    { label: '200 - 400 EGP', min: 200, max: 400 },
    { label: '400 - 600 EGP', min: 400, max: 600 },
    { label: '600 - 1000 EGP', min: 600, max: 1000 },
    { label: 'Over 1000 EGP', min: 1000, max: Infinity },
]

const MIN_PRICE = 0
const MAX_PRICE = 1500

export default function ShopFilters({ onCategoryChange, onPriceRangeChange }) {
    const [selectedCategories, setSelectedCategories] = useState([])
    const [selectedPriceRange, setSelectedPriceRange] = useState(null)
    const [sliderMax, setSliderMax] = useState(MAX_PRICE)

    const handleCategoryToggle = (category) => {
        const newSelected = selectedCategories.includes(category)
            ? selectedCategories.filter(c => c !== category)
            : [...selectedCategories, category]
        setSelectedCategories(newSelected)
        onCategoryChange?.(newSelected)
    }

    const handlePriceRangeSelect = (range) => {
        const newRange = selectedPriceRange?.label === range.label ? null : range
        setSelectedPriceRange(newRange)
        setSliderMax(MAX_PRICE) // reset slider
        onPriceRangeChange?.(newRange)
    }

    const handleSliderChange = (e) => {
        const value = parseInt(e.target.value)
        setSliderMax(value)
        setSelectedPriceRange(null) // clear radio selection
        if (value === MAX_PRICE) {
            // No filter when slider at max
            onPriceRangeChange?.(null)
        } else {
            // Create a custom range object
            const customRange = { label: `Under ${value} EGP`, min: MIN_PRICE, max: value }
            onPriceRangeChange?.(customRange)
        }
    }

    const clearFilters = () => {
        setSelectedCategories([])
        setSelectedPriceRange(null)
        setSliderMax(MAX_PRICE)
        onCategoryChange?.([])
        onPriceRangeChange?.(null)
    }

    const hasActiveFilters = selectedCategories.length > 0 || selectedPriceRange || sliderMax !== MAX_PRICE

    return (
        <div className="w-full p-4">
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

            {/* Price Range Section */}
            <div className="mb-8">
                <h4 className="font-medium text-slate-700 mb-4">Price Range</h4>
                
                {/* Slider */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>Max price: <strong>EGP {sliderMax}</strong></span>
                        <span>EGP {MIN_PRICE} - EGP {MAX_PRICE}</span>
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
                <div className="space-y-3">
                    {priceRanges.map((range) => (
                        <label key={range.label} className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="priceRange"
                                checked={selectedPriceRange?.label === range.label}
                                onChange={() => handlePriceRangeSelect(range)}
                                className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-slate-700">{range.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Active filters summary */}
            {hasActiveFilters && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-2">Active filters:</p>
                    <div className="flex flex-wrap gap-2">
                        {selectedCategories.map(cat => (
                            <span key={cat} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                                Under ${sliderMax} EGP
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}