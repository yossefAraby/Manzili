"use client";
import StoreInfo from "@/components/admin/StoreInfo";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { fetchStores, storeAction } from "@/lib/api/admin";

export default function AdminApprove() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStores = async () => {
    try {
      // fetchStores('pending') is fail-safe (returns [] on error/empty DB).
      const list = await fetchStores("pending");
      setStores(list || []);
    } catch {
      toast.error("Failed to load pending stores");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (storeId, action) => {
    await storeAction({ storeId, action });
    await loadStores();
  };

  useEffect(() => {
    loadStores();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="text-slate-500 mb-28">
      <h1 className="text-2xl text-slate-500 mb-5">
        Approve <span className="text-slate-800 font-medium">Stores</span>
      </h1>

      {stores.length === 0 ? (
        <div className="flex items-center justify-center h-60">
          <p className="text-2xl text-slate-400 font-medium">
            No pending applications. ✓
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white border border-slate-200 rounded-lg p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl mb-4"
            >
              {/* Store Info */}
              <StoreInfo store={store} />

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                <button
                  onClick={() =>
                    toast.promise(handleApprove(store.id, "approve"), {
                      loading: "Approving...",
                    })
                  }
                  className="px-4 py-2 bg-[#2582eb] text-white rounded hover:bg-[#2582eb]/90 text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    toast.promise(handleApprove(store.id, "reject"), {
                      loading: "Rejecting...",
                    })
                  }
                  className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
