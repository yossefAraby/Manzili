'use client'
import PageTitle from "@/components/PageTitle";
import { addToCart } from "@/lib/features/cart/cartSlice";
import { clearWishlist, removeFromWishlist } from "@/lib/features/wishlist/wishlistSlice";
import { getCurrencySymbol } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";

export default function WishlistPage() {
    const dispatch = useDispatch();
    const currency = getCurrencySymbol();

    const wishlistItems = useSelector((state) => state.wishlist.wishlistItems);
    const products = useSelector((state) => state.product.list);

    const wishlistedProducts = products.filter((product) => wishlistItems[product.id]);

    if (wishlistedProducts.length === 0) {
        return (
            <div className="min-h-[70vh] mx-6">
                <div className="max-w-7xl mx-auto">
                    <PageTitle heading="My Wishlist" text="0 items saved" linkText="Continue shopping" path="/shop" />
                    <div className="border border-slate-200 rounded-xl p-8 text-slate-500">
                        Your wishlist is empty.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-start justify-between gap-4">
                    <PageTitle
                        heading="My Wishlist"
                        text={`${wishlistedProducts.length} items saved`}
                        linkText="Continue shopping"
                        path="/shop"
                    />
                    <button
                        onClick={() => dispatch(clearWishlist())}
                        className="mt-6 border border-slate-300 text-slate-600 px-4 py-2 rounded text-sm hover:bg-slate-50 transition"
                    >
                        Clear all
                    </button>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 mb-20">
                    {wishlistedProducts.map((item) => (
                        <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                            <Link href={`/product/${item.id}`} className="flex items-center gap-4 min-w-0">
                                <div className="bg-slate-100 rounded-lg size-18 flex items-center justify-center">
                                    <Image src={item.images[0]} alt="" width={45} height={45} className="h-12 w-auto" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-slate-800 truncate">{item.name}</p>
                                    <p className="text-sm text-slate-500">{item.category}</p>
                                    <p className="text-sm text-slate-700 mt-1">{currency}{item.price}</p>
                                </div>
                            </Link>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => dispatch(addToCart({ productId: item.id }))}
                                    className="border border-slate-300 text-slate-700 px-3 py-2 rounded text-sm hover:bg-slate-50 transition"
                                >
                                    Add to cart
                                </button>
                                <button
                                    onClick={() => dispatch(removeFromWishlist({ productId: item.id }))}
                                    className="border border-slate-300 text-slate-500 px-3 py-2 rounded text-sm hover:bg-slate-50 transition"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
