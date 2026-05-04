"use client";
import { Suspense, useEffect, useState, useMemo } from "react";
import CustomRequestCard from "@/components/CustomRequestCard";
import CustomFilters from "@/components/CustomFilters";
import { MoveLeftIcon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { setCustomRequests } from "@/lib/features/customRequest/customRequestSlice";

// Mock data for custom requests (to be replaced with API)
const mockCustomRequests = [
  {
    id: "req_1",
    itemName: "Custom Wooden Coffee Table",
    description: "Looking for a rustic wooden coffee table with metal legs, approximately 120cm x 60cm. Prefer reclaimed wood with a natural finish.",
    images: ["/dummydata/Wooden Key Holder.png"],
    visibility: "open",
    category: "Woodwork",
    quantity: 1,
    size: { length: 120, width: 60, height: 45 },
    material: "Reclaimed wood, metal",
    deliveryDate: "2026-06-15",
    createdAt: "2026-04-28T10:30:00Z",
    user: { name: "Alex Johnson" },
  },
  {
    id: "req_2",
    itemName: "Handmade Leather Journal",
    description: "Need a custom leather journal with embossed initials. Size should be A5, with at least 200 pages of high-quality paper.",
    images: ["/dummydata/Handmade Notebook.png"],
    visibility: "private",
    category: "Stationery",
    quantity: 2,
    size: { length: 21, width: 15, height: 2 },
    material: "Genuine leather, cotton paper",
    deliveryDate: "2026-05-20",
    createdAt: "2026-04-27T14:20:00Z",
    user: { name: "Samira Ahmed" },
    store: { name: "Nour Handmade & Crafts", username: "nourhandmade" },
  },
  {
    id: "req_3",
    itemName: "Ceramic Dinner Set for 6",
    description: "Looking for a complete ceramic dinner set for 6 people with a modern minimalist design. Should be dishwasher safe.",
    images: ["/dummydata/Ceramic Dinner Sets.png"],
    visibility: "open",
    category: "Porcelain",
    quantity: 1,
    size: { length: 30, width: 30, height: 15 },
    material: "Ceramic",
    deliveryDate: "2026-06-01",
    createdAt: "2026-04-26T09:15:00Z",
    user: { name: "Michael Chen" },
  },
  {
    id: "req_4",
    itemName: "Custom Beaded Bracelet Set",
    description: "Want a set of 3 matching beaded bracelets with gemstones. Colors: turquoise, silver, and black.",
    images: ["/dummydata/Beaded Bracelet.png"],
    visibility: "open",
    category: "Accessories",
    quantity: 3,
    size: { length: 18, width: 1, height: 1 },
    material: "Gemstones, silver beads, elastic cord",
    deliveryDate: "2026-05-10",
    createdAt: "2026-04-25T16:45:00Z",
    user: { name: "Layla Hassan" },
  },
  {
    id: "req_5",
    itemName: "Homemade Chocolate Chip Cookies",
    description: "Looking for 2 dozen homemade chocolate chip cookies, preferably with walnuts. Should be delivered fresh.",
    images: ["/dummydata/Homemade Cookies.png"],
    visibility: "private",
    category: "Food & Snacks",
    quantity: 24,
    size: { length: 8, width: 8, height: 5 },
    material: "",
    deliveryDate: "2026-05-05",
    createdAt: "2026-04-24T11:10:00Z",
    user: { name: "David Wilson" },
    store: { name: "Tasty Home", username: "tastyhome" },
  },
  {
    id: "req_6",
    itemName: "Embroidered Cotton Towels",
    description: "Need a set of 4 embroidered cotton bath towels with monogram initials. Colors: white with blue embroidery.",
    images: ["/dummydata/Towels Sets.png"],
    visibility: "open",
    category: "Textiles",
    quantity: 4,
    size: { length: 70, width: 140, height: 2 },
    material: "100% cotton",
    deliveryDate: "2026-05-30",
    createdAt: "2026-04-23T13:25:00Z",
    user: { name: "Sarah Miller" },
  },
];

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

  // Fetch custom requests from API
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/custom-order');
        const data = await response.json();
        if (data.success) {
          dispatch(setCustomRequests(data.requests));
        }
      } catch (error) {
        console.error('Error fetching custom requests:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (customRequests.length === 0) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [customRequests.length, dispatch]);

  // Apply filters
  const filteredRequests = useMemo(() => {
    let filtered = customRequests;

    // Search filter
    if (search) {
      filtered = filtered.filter(request =>
        request.itemName.toLowerCase().includes(search.toLowerCase()) ||
        request.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Visibility filter
    if (selectedVisibility !== "all") {
      filtered = filtered.filter(request => request.visibility === selectedVisibility);
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const selectedLower = selectedCategories.map(c => c.toLowerCase());
      filtered = filtered.filter(request =>
        selectedLower.includes(request.category?.toLowerCase())
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
            onClick={() => router.push('/custom-products')}
            className="text-2xl text-slate-500 flex items-center gap-2 cursor-pointer"
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
                <p className="text-slate-500 text-lg">No custom requests match your filters.</p>
                <p className="text-slate-400 mt-2">
                  {search ? "Try a different search term" : "Be the first to create a custom request!"}
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
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Loading custom requests...</div>}>
      <CustomProductsContent />
    </Suspense>
  );
}
