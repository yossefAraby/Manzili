'use client'
import { Suspense, useState, useMemo } from "react"
import ProductCard from "@/components/ProductCard"
import ShopFilters from "@/components/ShopFilters"
import { MoveLeftIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSelector } from "react-redux"

function ShopContent() {
    // get query params ?search=abc
    const searchParams = useSearchParams()
    const search = searchParams.get('search')
    const router = useRouter()

    const products = useSelector(state => state.product.list)

    // Filter states
    const [selectedCategories, setSelectedCategories] = useState([])
    const [selectedPriceRange, setSelectedPriceRange] = useState(null)

    // Apply filters
    const filteredProducts = useMemo(() => {
        let filtered = products

        // Search filter
        if (search) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(search.toLowerCase())
            )
        }

        // Category filter
        if (selectedCategories.length > 0) {
            const selectedLower = selectedCategories.map(c => c.toLowerCase())
            filtered = filtered.filter(product =>
                selectedLower.includes(product.category.toLowerCase())
            )
        }

        // Price range filter
        if (selectedPriceRange) {
            filtered = filtered.filter(product => {
                const price = product.price
                const { min, max } = selectedPriceRange
                if (max === Infinity) return price >= min
                return price >= min && price <= max
            })
        }

        return filtered
    }, [products, search, selectedCategories, selectedPriceRange])

    const handleCategoryChange = (categories) => {
        setSelectedCategories(categories)
    }

    const handlePriceRangeChange = (range) => {
        setSelectedPriceRange(range)
    }

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                <h1 onClick={() => router.push('/shop')} className="text-2xl text-slate-500 my-6 flex items-center gap-2 cursor-pointer">
                    {search && <MoveLeftIcon size={20} />}
                    All <span className="text-slate-700 font-medium">Products</span>
                </h1>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    {/* Products grid - left side */}
                    <div className="lg:flex-1">
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 xl:gap-8 mb-32">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-slate-500 text-lg">No products match your filters.</p>
                                    <p className="text-slate-400 mt-2">Try adjusting your search or filters.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filters sidebar - right side */}
                    <div className="lg:w-72 xl:w-80">
                        <ShopFilters
                            onCategoryChange={handleCategoryChange}
                            onPriceRangeChange={handlePriceRangeChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Shop() {
    return (
        <Suspense fallback={<div>Loading shop...</div>}>
            <ShopContent />
        </Suspense>
    )
}