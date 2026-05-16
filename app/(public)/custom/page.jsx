"use client";
import { Suspense, useEffect, useState, useMemo } from "react";
import CustomRequestCard from "@/components/CustomRequestCard";
import CustomFilters from "@/components/CustomFilters";
import { MoveLeftIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { selectIsSeller } from "@/lib/features/auth/authSlice";
import { setCustomRequests } from "@/lib/features/customRequest/customRequestSlice";
import {
  OFFER_STATUS,
  listCustomRequests,
  listOffersBySellerId,
} from "@/lib/services/localCustomRequestService";

// Statuses that count as "this seller is actively engaged" → pin the
// request. Terminal lost statuses (declined / blocked / superseded) are
// excluded; they're still visible via the regular listing but don't
// deserve special placement.
const SELLER_PINNED_STATUSES = new Set([
  OFFER_STATUS.PENDING,
  OFFER_STATUS.ACCEPTED,
  OFFER_STATUS.READY_TO_SHIP,
  OFFER_STATUS.PAID,
]);
// Accepted-and-onwards → highlighted with a ring + "Accepted" pill.
const SELLER_ACCEPTED_STATUSES = new Set([
  OFFER_STATUS.ACCEPTED,
  OFFER_STATUS.READY_TO_SHIP,
  OFFER_STATUS.PAID,
]);

function CustomProductsContent() {
  // get query params ?search=abc
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const router = useRouter();
  const dispatch = useDispatch();

  const customRequests = useSelector((state) => state.customRequest.list);
  const session = useSelector((state) => state.auth.session);
  const currentUserId = session?.userId || null;
  const isSeller = useSelector(selectIsSeller);
  const [loading, setLoading] = useState(true);
  // Map: requestId → { pinned, accepted }. Built once per seller account
  // change. Buyers / guests get an empty map and the card flags become
  // no-ops, preserving the existing experience for non-sellers.
  const [sellerMarks, setSellerMarks] = useState({});

  // Filter states
  const [selectedOwnership, setSelectedOwnership] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const local = await listCustomRequests();
        if (cancelled) return;
        dispatch(setCustomRequests(local));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // Seller-only side effect: figure out which requests this seller has
  // sent a proposal on, and which of those proposals are accepted. The
  // result is keyed by requestId so the render path is a cheap lookup.
  useEffect(() => {
    let cancelled = false;
    if (!isSeller || !currentUserId) {
      setSellerMarks({});
      return undefined;
    }
    (async () => {
      const offers = await listOffersBySellerId(currentUserId);
      if (cancelled) return;
      const marks = {};
      for (const offer of offers) {
        const current = marks[offer.requestId] || { pinned: false, accepted: false };
        if (SELLER_PINNED_STATUSES.has(offer.status)) current.pinned = true;
        if (SELLER_ACCEPTED_STATUSES.has(offer.status)) current.accepted = true;
        marks[offer.requestId] = current;
      }
      setSellerMarks(marks);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSeller, currentUserId, customRequests]);

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

    // Ownership filter
    if (selectedOwnership === "mine") {
      filtered = currentUserId
        ? filtered.filter((request) => request.ownerUserId === currentUserId)
        : [];
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const selectedLower = selectedCategories.map((c) => c.toLowerCase());
      filtered = filtered.filter((request) =>
        selectedLower.includes(request.category?.toLowerCase()),
      );
    }

    // Seller view: accepted-on requests bubble to the top, then merely
    // pinned (= pending / paid / ready-to-ship), then everything else.
    // Within each bucket the existing date order from
    // listCustomRequests is preserved.
    if (isSeller && Object.keys(sellerMarks).length > 0) {
      const rank = (req) => {
        const m = sellerMarks[req.id];
        if (m?.accepted) return 0;
        if (m?.pinned) return 1;
        return 2;
      };
      filtered = [...filtered].sort((a, b) => rank(a) - rank(b));
    }

    return filtered;
  }, [customRequests, search, selectedOwnership, selectedCategories, currentUserId, isSeller, sellerMarks]);

  const handleOwnershipChange = (ownership) => {
    setSelectedOwnership(ownership);
  };

  const handleCategoryChange = (categories) => {
    setSelectedCategories(categories);
  };

  const handleClearFilters = () => {
    setSelectedOwnership("all");
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
            onClick={() => router.push("/custom/custom-form")}
            className="bg-[#1c355e] hover:bg-[#2582eb] text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 shrink-0"
          >
            <PlusIcon size={20} />
            Add New Request
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-12">
          {/* Filters: source-order first so its mobile pill (and any open
              drawer) sit above the grid on small screens. On lg+ we
              reorder so the panel becomes a right sidebar — matches the
              previous layout. CustomFilters internally renders a pill
              (mobile only) and a panel (desktop only) from one instance,
              keeping state in sync. */}
          <div className="lg:order-2 lg:w-72 xl:w-80">
            <CustomFilters
              onOwnershipChange={handleOwnershipChange}
              onCategoryChange={handleCategoryChange}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Requests grid - left side */}
          <div className="lg:flex-1 lg:order-1">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Loading custom requests...</p>
              </div>
            ) : filteredRequests.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 xl:gap-8 mb-32">
                {filteredRequests.map((request) => {
                  const mark = sellerMarks[request.id];
                  return (
                    <CustomRequestCard
                      key={request.id}
                      request={request}
                      pinned={Boolean(mark?.pinned || mark?.accepted)}
                      accepted={Boolean(mark?.accepted)}
                    />
                  );
                })}
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
                  onClick={() => router.push("/custom/custom-form")}
                  className="mt-6 bg-[#1c355e] hover:bg-[#2582eb] text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 mx-auto"
                >
                  <PlusIcon size={20} />
                  Create Your First Request
                </button>
              </div>
            )}
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
