'use client'
import Loading from "@/components/Loading"
import { CircleDollarSignIcon, ShoppingBasketIcon, StarIcon, TagsIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { getCurrencySymbol } from "@/lib/currency"
import { fetchDashboard } from "@/lib/api/seller"

export default function Dashboard() {

    const currency = getCurrencySymbol()
    const router = useRouter()
    const session = useSelector((s) => s.auth.session)
    const productList = useSelector((s) => s.product.list)

    const storeId = session?.storeId

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: [],
    })

    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: 'Total Earnings', value: currency + dashboardData.totalEarnings, icon: CircleDollarSignIcon },
        { title: 'Total Orders', value: dashboardData.totalOrders, icon: TagsIcon },
        { title: 'Total Ratings', value: dashboardData.ratings.length, icon: StarIcon },
    ]

    useEffect(() => {
        let cancelled = false
        const run = async () => {
            if (!storeId) {
                setDashboardData({
                    totalProducts: 0,
                    totalEarnings: 0,
                    totalOrders: 0,
                    ratings: [],
                })
                setLoading(false)
                return
            }
            // The .NET seller dashboard endpoint is the single source of truth.
            // On error we render the zeroed empty state (no local fallback).
            let next = {
                totalProducts: 0,
                totalEarnings: 0,
                totalOrders: 0,
                ratings: [],
            }
            try {
                const d = await fetchDashboard()
                next = {
                    totalProducts: d.totalProducts || 0,
                    totalEarnings: Number((d.totalEarnings || 0).toFixed(2)),
                    totalOrders: d.totalOrders || 0,
                    ratings: Array.isArray(d.ratings) ? d.ratings : [],
                }
            } catch {
                // leave the zeroed empty shape above
            }

            if (!cancelled) {
                setDashboardData(next)
                setLoading(false)
            }
        }
        run()
        return () => {
            cancelled = true
        }
    }, [storeId, productList])

    if (loading) return <Loading />

    return (
        <div className=" text-slate-500 mb-28">
            <h1 className="text-2xl">Seller <span className="text-slate-800 font-medium">Dashboard</span></h1>

            <div className="flex flex-wrap gap-5 my-10 mt-4">
                {
                    dashboardCardsData.map((card, index) => (
                        <div key={index} className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
                            <div className="flex flex-col gap-3 text-xs">
                                <p>{card.title}</p>
                                <b className="text-2xl font-medium text-slate-700">{card.value}</b>
                            </div>
                            <card.icon size={50} className=" w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full" />
                        </div>
                    ))
                }
            </div>

            <h2>Total Reviews</h2>

            <div className="mt-5">
                {dashboardData.ratings.length === 0 ? (
                    <p className="text-slate-500 text-sm">No reviews yet for products in this store.</p>
                ) : (
                    dashboardData.ratings.map((review, index) => (
                        <div key={index} className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-6 border-b border-slate-200 text-sm text-slate-600 max-w-4xl">
                            <div>
                                <div className="flex gap-3">
                                    <Image src={review.user.image} alt="" className="w-10 aspect-square rounded-full" width={100} height={100} />
                                    <div>
                                        <p className="font-medium">{review.user.name}</p>
                                        <p className="font-light text-slate-500">{new Date(review.createdAt).toDateString()}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-slate-500 max-w-xs leading-6">{review.review}</p>
                            </div>
                            <div className="flex flex-col justify-between gap-6 sm:items-end">
                                <div className="flex flex-col sm:items-end">
                                    <p className="text-slate-400">{review.product?.category}</p>
                                    <p className="font-medium">{review.product?.name}</p>
                                    <div className='flex items-center'>
                                        {Array(5).fill('').map((_, starIndex) => (
                                            <StarIcon key={starIndex} size={17} className='text-transparent mt-0.5' fill={review.rating >= starIndex + 1 ? "#2582eb" : "#D1D5DB"} />
                                        ))}
                                    </div>
                                </div>
                                <button type="button" onClick={() => router.push(`/product/${review.product.id}`)} className="bg-slate-100 px-5 py-2 hover:bg-slate-200 rounded transition-all">View Product</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
