"use client";
import { Suspense, useEffect, useState, useMemo } from "react";
import CustomRequestCard from "@/components/CustomRequestCard";
import CustomFilters from "@/components/CustomFilters";
import { MoveLeftIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { setCustomRequests } from "@/lib/features/customRequest/customRequestSlice";
import {
  getLocalCustomRequests,
  mergeCustomRequestLists,
} from "@/lib/customRequestsLocal";

function CustomProductsContent() {
  // get query params ?search=abc
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const router = useRouter();
  const dispatch = useDispatch();

  const customRequests = useSelector((state) => state.customRequest.list);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedVisibility, setSelectedVisibility] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const local = getLocalCustomRequests();
        let apiList = [];
        try {
          const response = await fetch("/api/custom-order");
          const data = await response.json();
          if (data.success && Array.isArray(data.requests)) {
            apiList = data.requests;
          }
        } catch (error) {
          console.error("Error fetching custom requests:", error);
        }
        if (cancelled) return;
        const merged = mergeCustomRequestLists(apiList, local);
        dispatch(setCustomRequests(merged));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // Apply filters
  const filteredRequests = useMemo(() => {
    let filtered = customRequests;

    // Search filter
    if (search) {
      filtered = filtered.filter(
        (request) =>
          request.itemName.toLowerCase().includes(search.toLowerCase()) ||
          request.description.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Visibility filter
    if (selectedVisibility !== "all") {
      filtered = filtered.filter(
        (request) => request.visibility === selectedVisibility,
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const selectedLower = selectedCategories.map((c) => c.toLowerCase());
      filtered = filtered.filter((request) =>
        selectedLower.includes(request.category?.toLowerCase()),
      );
    }

    return filtered;
  }, [customRequests, search, selectedVisibility, selectedCategories]);

  const handleVisibilityChange = (visibility) => {
    setSelectedVisibility(visibility);
  };

  const handleCategoryChange = (categories) => {
    setSelectedCategories(categories);
  };

  const handleClearFilters = () => {
    setSelectedVisibility("all");
    setSelectedCategories([]);
  };

  return (
    <div className="min-h-[70vh] mx-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-6 gap-4">
          <h1
            // onClick={() => router.push("/shop")} // go back to shop page without search query
            className="text-2xl text-slate-500 flex items-center gap-2 hover:text-slate-700 transition-colors"
          >
            {search && <MoveLeftIcon size={20} />}
            Custom <span className="text-slate-700 font-medium">Requests</span>
          </h1>

          <button
            onClick={() => router.push("/custom-order")}
            className="bg-[#1c355e] hover:bg-[#2582eb] text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 shrink-0"
          >
            <PlusIcon size={20} />
            Add New Request
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Requests grid - left side */}
          <div className="lg:flex-1">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Loading custom requests...</p>
              </div>
            ) : filteredRequests.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 xl:gap-8 mb-32">
                {filteredRequests.map((request) => (
                  <CustomRequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500 text-lg">
                  No custom requests match your filters.
                </p>
                <p className="text-slate-400 mt-2">
                  {search
                    ? "Try a different search term"
                    : "Be the first to create a custom request!"}
                </p>
                <button
                  onClick={() => router.push("/custom-order")}
                  className="mt-6 bg-[#1c355e] hover:bg-[#2582eb] text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 mx-auto"
                >
                  <PlusIcon size={20} />
                  Create Your First Request
                </button>
              </div>
            )}
          </div>

          {/* Filters sidebar - right side */}
          <div className="lg:w-72 xl:w-80">
            <CustomFilters
              onVisibilityChange={handleVisibilityChange}
              onCategoryChange={handleCategoryChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          Loading custom requests...
        </div>
      }
    >
      <CustomProductsContent />
    </Suspense>
  );
}
