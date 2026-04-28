"use client";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import { MoveLeftIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

function ShopContent() {
  // get query params ?search=abc
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const router = useRouter();

  const products = useSelector((state) => state.product.list);

  const filteredProducts = search
    ? products.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  return (
    <div className="min-h-[70vh] mx-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-6 gap-4">
          <h1
            // onClick={() => router.push("/shop")} // go back to shop page without search query
            className="text-2xl text-slate-500 flex items-center gap-2 hover:text-slate-700 transition-colors"
          >
            {search && <MoveLeftIcon size={20} />} Open{" "}
            <span className="text-slate-700 font-medium"> Requests</span>
          </h1>

          <button
            onClick={() => router.push("/custom-order")}
            className="bg-[#1c355e] hover:bg-[#2582eb] text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 shrink-0"
          >
            <PlusIcon size={20} />
            Add New Request
          </button>
        </div>

        <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<div>Loading shop...</div>}>
      <ShopContent />
    </Suspense>
  );
}
