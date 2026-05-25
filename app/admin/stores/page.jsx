"use client";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";
import Image from "next/image";
import Pagination from "@/components/Pagination";

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-[#2582eb]/10 text-[#2582eb]",
  rejected: "bg-red-50 text-red-700",
};

export default function AdminStores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedStore, setSelectedStore] = useState(null);
  const [actioning, setActioning] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/admin/all-stores");
      const data = await res.json();
      setStores(data.stores || []);
    } catch {
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (storeId, action) => {
    setActioning(storeId);
    try {
      const res = await fetch("/api/admin/all-stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Store ${action}d successfully`);
      await fetchStores();
      if (selectedStore?.id === storeId) setSelectedStore(null);
    } catch {
      toast.error(`Failed to ${action} store`);
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = (storeId) => {
    if (
      !confirm(
        "Are you sure you want to delete this store? This action cannot be undone.",
      )
    )
      return;
    toast.promise(handleAction(storeId, "delete"), {
      loading: "Deleting store...",
    });
  };

  const toggleActive = (store) => {
    const action = store.isActive ? "disable" : "enable";
    toast.promise(handleAction(store.id, action), { loading: "Updating..." });
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const filteredStores =
    filter === "all" ? stores : stores.filter((s) => s.status === filter);

  const totalPages = Math.max(1, Math.ceil(filteredStores.length / ITEMS_PER_PAGE));
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStores.length]);

  if (loading) return <Loading />;

  return (
    <div className="text-slate-500 mb-28">
      <h1 className="text-2xl text-slate-500 mb-5">
        All <span className="text-slate-800 font-medium">Stores</span>
      </h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["all", "approved", "pending", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-4 py-1.5 rounded-full border transition capitalize ${filter === f ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredStores.length === 0 ? (
        <p className="text-slate-600 mt-4">No items found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Sr.
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Store
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Owner
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Status
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Active
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Products
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedStores.map((store, i) => (
                <tr key={store.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-[#2582eb] font-medium">
                    {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src={store.logo}
                        alt={store.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-slate-800 font-medium">
                          {store.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          @{store.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-800">
                    <p>{store.user?.name}</p>
                    <p className="text-xs text-slate-400">
                      {store.user?.email}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[store.status] || "bg-slate-100 text-slate-600"}`}
                    >
                      {store.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={store.isActive}
                        disabled={actioning === store.id}
                        onChange={() => toggleActive(store)}
                      />
                      <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-[#2582eb] transition-colors duration-200"></div>
                      <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                    </label>
                  </td>
                  <td className="py-3 px-4 text-slate-800">
                    {store._count?.Product ?? 0}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedStore(store)}
                        className="text-xs text-[#2582eb] hover:underline cursor-pointer"
                      >
                        View
                      </button>
                      {store.status === "pending" ? (
                        <>
                          <button
                            disabled={actioning === store.id}
                            onClick={() =>
                              toast.promise(handleAction(store.id, "approve"), {
                                loading: "Approving...",
                              })
                            }
                            className="text-xs border border-emerald-200 text-emerald-600 px-3 py-1 rounded hover:bg-emerald-50 transition disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actioning === store.id}
                            onClick={() =>
                              toast.promise(handleAction(store.id, "reject"), {
                                loading: "Rejecting...",
                              })
                            }
                            className="text-xs border border-slate-200 text-slate-600 px-3 py-1 rounded hover:bg-slate-50 transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={actioning === store.id}
                          onClick={() => handleDelete(store.id)}
                          className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

      {/* Store Detail Modal */}
      {selectedStore && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Store Details
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <Image
                src={selectedStore.logo}
                alt={selectedStore.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-slate-800">
                  {selectedStore.name}
                </p>
                <p className="text-xs text-slate-400">
                  @{selectedStore.username}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p>
                <span className="text-[#2582eb]">Email:</span>{" "}
                {selectedStore.email}
              </p>
              <p>
                <span className="text-[#2582eb]">Contact:</span>{" "}
                {selectedStore.contact}
              </p>
              <p>
                <span className="text-[#2582eb]">Address:</span>{" "}
                {selectedStore.address}
              </p>
              <p>
                <span className="text-[#2582eb]">Status:</span>{" "}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[selectedStore.status] || "bg-slate-100 text-slate-600"}`}
                >
                  {selectedStore.status}
                </span>
              </p>
              <p>
                <span className="text-[#2582eb]">Active:</span>{" "}
                {selectedStore.isActive ? "Yes" : "No"}
              </p>
              <p>
                <span className="text-[#2582eb]">Created At:</span>{" "}
                {new Date(selectedStore.createdAt).toLocaleDateString()}
              </p>
              <p>
                <span className="text-[#2582eb]">Products:</span>{" "}
                {selectedStore._count?.Product ?? 0}
              </p>
              <p>
                <span className="text-[#2582eb]">Orders:</span>{" "}
                {selectedStore._count?.StoreOrder ?? 0}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Owner</p>
              <div className="flex items-center gap-2">
                {selectedStore.user?.image && (
                  <Image
                    src={selectedStore.user.image}
                    alt={selectedStore.user.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <p className="text-slate-700 font-medium">
                    {selectedStore.user?.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedStore.user?.email}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedStore(null)}
              className="mt-6 px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
