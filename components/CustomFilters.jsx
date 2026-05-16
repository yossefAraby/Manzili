'use client'

import { categories } from '@/assets/assets'
import { FilterIcon } from 'lucide-react'
import { useState } from 'react'

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