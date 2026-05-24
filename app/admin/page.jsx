"use client";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";
import {
  CircleDollarSignIcon,
  ShoppingBasketIcon,
  StoreIcon,
  TagsIcon,
  FlagIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrencySymbol } from "@/lib/currency";
import Link from "next/link";

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

  const fetchData = async () => {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/reports?status=PENDING"),
      ]);
      const statsData = await statsRes.json();
      const reportsData = await reportsRes.json();
      setStats(statsData);
      setPendingReports((reportsData.reports || []).slice(0, 5));
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
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
