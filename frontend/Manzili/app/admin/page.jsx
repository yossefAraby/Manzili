"use client";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";
import {
  CircleDollarSignIcon,
  ShoppingBasketIcon,
  StoreIcon,
  TagsIcon,
  FlagIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrencySymbol } from "@/lib/currency";
import Link from "next/link";
import {
  fetchStats,
  fetchReports,
  fetchAdminMe,
  fetchAdminRevenue,
  purgeAllItems,
  purgeAllUsers,
} from "@/lib/api/admin";

const TYPE_LABELS = {
  NON_HANDMADE_PRODUCT: "Non-Handmade Product",
  SELLER_MISCONDUCT: "Seller Misconduct",
  UNFULFILLED_CUSTOM_REQUEST: "Unfulfilled Request",
  GENERAL: "General",
};

export default function AdminDashboard() {
  const currency = getCurrencySymbol();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    stores: 0,
    products: 0,
    orders: 0,
    revenue: 0,
    pendingReports: 0,
  });
  const [pendingReports, setPendingReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [revenue, setRevenue] = useState(null); // Manzili commission (full admins only)
  // Danger-zone confirmation: { kind: 'items' | 'users' } while a dialog is open.
  const [purgeDialog, setPurgeDialog] = useState(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [purging, setPurging] = useState(false);

  const fetchData = async () => {
    try {
      // lib/api/admin.js helpers are individually fail-safe (return zero
      // stats / empty list on error), so an empty DB renders cleanly.
      const [statsData, reportsData, me] = await Promise.all([
        fetchStats(),
        fetchReports("PENDING"),
        fetchAdminMe(),
      ]);
      setStats(statsData);
      setPendingReports((reportsData || []).slice(0, 5));
      const superAdmin = Boolean(me?.isSuperAdmin);
      setIsSuperAdmin(superAdmin);
      // Manzili's own commission revenue is full-admin-only (moderators get 403 → null).
      if (superAdmin) setRevenue(await fetchAdminRevenue());
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Each danger-zone action requires typing an exact confirm word.
  const PURGE_META = {
    items: {
      title: "Delete all items",
      confirmWord: "DELETE ITEMS",
      run: purgeAllItems,
      blurb:
        "Permanently deletes every product and custom-order item (and their variants, images, reviews, cart/wishlist links). Users and Manzili's core data are kept.",
    },
    users: {
      title: "Delete all users",
      confirmWord: "DELETE USERS",
      run: purgeAllUsers,
      blurb:
        "Permanently deletes every non-admin user and everything they own (orders, stores, products, wallets, custom requests, addresses…). Admin accounts are kept.",
    },
  };

  const runPurge = async () => {
    const meta = PURGE_META[purgeDialog];
    if (!meta || purgeConfirmText.trim() !== meta.confirmWord) return;
    setPurging(true);
    try {
      await toast.promise(meta.run(), {
        loading: "Deleting…",
        success: (msg) => msg || "Done.",
        error: (e) => e?.message || "Delete failed — nothing was removed.",
      });
      setPurgeDialog(null);
      setPurgeConfirmText("");
      await fetchData();
    } finally {
      setPurging(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Loading />;

  const cards = [
    {
      title: "Total Stores",
      value: stats.stores,
      icon: StoreIcon,
      iconClass: "text-slate-400 bg-slate-100",
    },
    {
      title: "Total Products",
      value: stats.products,
      icon: ShoppingBasketIcon,
      iconClass: "text-slate-400 bg-slate-100",
    },
    {
      title: "Total Orders",
      value: stats.orders,
      icon: TagsIcon,
      iconClass: "text-slate-400 bg-slate-100",
    },
    {
      title: "Total Revenue",
      value: `${currency} ${stats.revenue}`,
      icon: CircleDollarSignIcon,
      iconClass: "text-slate-400 bg-slate-100",
    },
    {
      title: "Pending Reports",
      value: stats.pendingReports,
      icon: FlagIcon,
      iconClass: "text-amber-500 bg-amber-50",
      isPending: true,
    },
  ];

  return (
    <div className="text-slate-500 mb-28">
      <h1 className="text-2xl text-slate-500 mb-5">
        Admin <span className="text-slate-800 font-medium">Dashboard</span>
      </h1>

      {/* Stat Cards */}
      <div className="flex flex-wrap gap-5 my-6">
        {cards.map((card, i) => (
          <div
            key={i}
            className="flex items-center gap-10 border border-slate-200 p-3 px-6 rounded-lg"
          >
            <div className="flex flex-col gap-3 text-xs">
              <p className="flex items-center gap-1.5">
                {card.isPending && card.value > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                )}
                {card.title}
              </p>
              <b className="text-2xl font-medium text-slate-700">
                {card.value}
              </b>
            </div>
            <card.icon
              size={50}
              className={`w-11 h-11 p-2.5 rounded-full ${card.iconClass}`}
            />
          </div>
        ))}
      </div>

      {/* Manzili platform revenue — full administrators only (commission take). */}
      {isSuperAdmin && revenue && (
        <div className="mt-2 mb-4 max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
            <CircleDollarSignIcon size={14} /> Manzili Revenue (commissions + promotions)
          </p>
          <p className="text-3xl font-semibold text-emerald-800 mt-1">
            {currency} {revenue.platformRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-1 mt-3 text-xs text-emerald-900/80">
            <span>Standard ({revenue.standardRatePercent}%): <b>{currency} {revenue.standardCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></span>
            <span>Custom ({revenue.customRatePercent}%): <b>{currency} {revenue.customCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></span>
            <span>Featured promotions: <b>{currency} {Number(revenue.promotionRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></span>
            <span>Gross sales: <b>{currency} {revenue.grossSales.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></span>
          </div>
          <p className="text-[11px] text-emerald-700/70 mt-2">
            Your real earnings — {revenue.standardRatePercent}% of standard sales, {revenue.customRatePercent}% of custom-order sales, plus 100% of paid product-feature promotions. Visible to full admins only.
          </p>
        </div>
      )}

      {/* Recent Pending Reports */}
      <h2 className="text-xl text-slate-500 mt-8 mb-3">
        Recent Pending{" "}
        <span className="text-slate-800 font-medium">Reports</span>
      </h2>

      {pendingReports.length === 0 ? (
        <p className="text-slate-500 text-sm mt-4">No pending reports. 🎉</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-5xl mt-4">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Type
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Reason
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Status
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Date
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pendingReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-800">
                    {TYPE_LABELS[report.type] || report.type}
                  </td>
                  <td className="py-3 px-4 text-slate-800">{report.reason}</td>
                  <td className="py-3 px-4">
                    <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full">
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-800">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="text-[#2582eb] hover:underline text-xs cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link
        href="/admin/reports"
        className="text-sm text-[#2582eb] hover:underline mt-4 inline-block"
      >
        View all reports →
      </Link>

      {/* Danger Zone — full administrators only (the backend also enforces this). */}
      {isSuperAdmin && (
        <div className="mt-12 max-w-3xl rounded-lg border border-red-200 bg-red-50/50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-medium text-red-700">
            <AlertTriangleIcon size={18} /> Danger Zone
          </h2>
          <p className="text-xs text-red-600/80 mt-1">
            Permanent, irreversible test-data resets. Admin accounts and Manzili&apos;s core
            reference data (categories, colours, shipping zones) are always kept.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => {
                setPurgeConfirmText("");
                setPurgeDialog("items");
              }}
              className="px-4 py-2 rounded-md border border-red-300 bg-white text-red-700 text-sm font-medium hover:bg-red-600 hover:text-white transition-colors"
            >
              Delete all items
            </button>
            <button
              onClick={() => {
                setPurgeConfirmText("");
                setPurgeDialog("users");
              }}
              className="px-4 py-2 rounded-md border border-red-300 bg-white text-red-700 text-sm font-medium hover:bg-red-600 hover:text-white transition-colors"
            >
              Delete all users
            </button>
          </div>
        </div>
      )}

      {/* Type-to-confirm dialog for a danger-zone purge. */}
      {purgeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs text-sm text-slate-700">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
              <AlertTriangleIcon size={18} /> {PURGE_META[purgeDialog].title}
            </h2>
            <p className="text-slate-600 mt-2">{PURGE_META[purgeDialog].blurb}</p>
            <p className="text-slate-700 mt-4">
              This cannot be undone. Type{" "}
              <span className="font-mono font-semibold text-red-700">
                {PURGE_META[purgeDialog].confirmWord}
              </span>{" "}
              to confirm.
            </p>
            <input
              autoFocus
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder={PURGE_META[purgeDialog].confirmWord}
              className="w-full mt-3 border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => {
                  setPurgeDialog(null);
                  setPurgeConfirmText("");
                }}
                disabled={purging}
                className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={runPurge}
                disabled={
                  purging ||
                  purgeConfirmText.trim() !== PURGE_META[purgeDialog].confirmWord
                }
                className="px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {purging ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Report Details
            </h2>
            <div className="space-y-2">
              <p>
                <span className="text-[#2582eb]">Type:</span>{" "}
                {TYPE_LABELS[selectedReport.type] || selectedReport.type}
              </p>
              <p>
                <span className="text-[#2582eb]">Reason:</span>{" "}
                {selectedReport.reason}
              </p>
              <p>
                <span className="text-[#2582eb]">Description:</span>{" "}
                {selectedReport.description}
              </p>
              <p>
                <span className="text-[#2582eb]">Reporter:</span>{" "}
                {selectedReport.reporter
                  ? `${selectedReport.reporter.name} (${selectedReport.reporter.email})`
                  : "Anonymous"}
              </p>
              {selectedReport.productId && (
                <p>
                  <span className="text-[#2582eb]">Product ID:</span>{" "}
                  {selectedReport.productId}
                </p>
              )}
              {selectedReport.storeId && (
                <p>
                  <span className="text-[#2582eb]">Store ID:</span>{" "}
                  {selectedReport.storeId}
                </p>
              )}
              {selectedReport.storeOrderId && (
                <p>
                  <span className="text-[#2582eb]">Order ID:</span>{" "}
                  {selectedReport.storeOrderId}
                </p>
              )}
              <p>
                <span className="text-[#2582eb]">Date:</span>{" "}
                {new Date(selectedReport.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3 mt-6 flex-wrap">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
              >
                Close
              </button>
              <Link
                href="/admin/reports"
                className="px-4 py-2 bg-[#2582eb] text-white rounded hover:bg-[#2582eb]/90 text-sm inline-flex items-center"
              >
                Go to Reports
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
