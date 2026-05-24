"use client";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  WalletIcon,
  ClockIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  XIcon,
} from "lucide-react";
import Loading from "@/components/Loading";
import { getCurrencySymbol } from "@/lib/currency";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n, symbol = "EGP") =>
  `${symbol} ${Number(n ?? 0).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TX_META = {
  SALE_CREDIT: { label: "Sale Credit" },
  SHIPPING_DEBIT: { label: "Shipping Fee" },
  COD_PENDING_CREDIT: { label: "COD Pending" },
  COD_RELEASE: { label: "COD Released" },
  ADJUSTMENT: { label: "Adjustment" },
};

// ─── Payout Modal ──────────────────────────────────────────────────────────────
function PayoutModal({ available, currency, onClose, onSuccess }) {
  const symbol = getCurrencySymbol();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const max = Number(available ?? 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const val = Number(amount);
    if (!val || val <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (val > max) {
      setError(`Cannot exceed available balance (${fmt(max, symbol)}).`);
      return;
    }
    setLoading(true);
    try {
      await onSuccess(val);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Request Payout
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-slate-600 font-medium text-sm">
                Amount ({symbol})
              </label>
              <input
                type="number"
                min="0.01"
                max={max}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">
                Available: {fmt(max, symbol)}
              </p>
              <button
                type="button"
                onClick={() => setAmount(String(max))}
                className="text-xs text-[#2582eb] hover:underline mt-1"
              >
                Use max
              </button>
            </div>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900 transition disabled:opacity-50"
              >
                {loading ? "Requesting…" : "Request Payout"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Bank Details Modal ────────────────────────────────────────────────────────
function BankDetailsModal({ storeId, onClose, onSuccess }) {
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/store/wallet/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          bankName: bankName.trim(),
          accountHolder: accountHolder.trim(),
          accountNumber: accountNumber.trim(),
          routingNumber: routingNumber.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to save bank details.");
      onSuccess(data);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Bank Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-slate-600 font-medium text-sm">
                Bank Name
              </label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. National Bank of Egypt"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-slate-600 font-medium text-sm">
                Account Holder Name
              </label>
              <input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Full name as on account"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-slate-600 font-medium text-sm">
                Account Number
              </label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-slate-600 font-medium text-sm">
                Routing Number{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
                placeholder="Routing / SWIFT / IBAN"
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#2582eb] bg-[#faf8f5] text-slate-700 text-sm"
              />
            </div>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900 transition disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save Details"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const storeId = useSelector((s) => s.auth.session?.storeId);
  const currencySymbol = getCurrencySymbol();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const fetchWallet = useCallback(
    async (silent = false) => {
      if (!storeId) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(
          `/api/store/wallet?storeId=${encodeURIComponent(storeId)}`,
        );
        if (!res.ok) throw new Error("Failed to fetch wallet");
        const data = await res.json();
        setWallet(data.wallet);
        setTransactions(
          Array.isArray(data.transactions) ? data.transactions : [],
        );
      } catch {
        setErrorMsg("Could not load wallet data. Please refresh.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [storeId],
  );

  const fetchBankDetails = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await fetch(
        `/api/store/wallet/bank-details?storeId=${encodeURIComponent(storeId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBankDetails(data);
      }
    } catch {
      // silent fail
    }
  }, [storeId]);

  useEffect(() => {
    fetchWallet();
    fetchBankDetails();
  }, [fetchWallet, fetchBankDetails]);

  const handlePayoutRequest = async (amount) => {
    const res = await fetch("/api/store/wallet/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Payout failed");
    setShowPayoutModal(false);
    setSuccessMsg(data.message || "Payout requested successfully!");
    setTimeout(() => setSuccessMsg(""), 6000);
    fetchWallet(true);
  };

  const handleBankDetailsSuccess = () => {
    setShowBankModal(false);
    setSuccessMsg("Bank details saved.");
    setTimeout(() => setSuccessMsg(""), 6000);
    fetchBankDetails();
  };

  const filteredTx =
    filterType === "ALL"
      ? transactions
      : transactions.filter((t) => t.type === filterType);

  if (loading) return <Loading />;

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <WalletIcon size={48} className="text-slate-300 mb-4" />
        <p className="text-slate-500 text-sm">
          You need a registered store to access the wallet.
        </p>
      </div>
    );
  }

  const available = Number(wallet?.availableBalance ?? 0);
  const pending = Number(wallet?.pendingBalance ?? 0);
  const total = available + pending;
  const currency = wallet?.currency || "EGP";

  return (
    <div className="text-slate-500 mb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl text-slate-500">
          Seller <span className="text-slate-800 font-medium">Wallet</span>
        </h1>
        <button
          onClick={() => fetchWallet(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <RefreshCwIcon
            size={13}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-5 max-w-xl">
          <CheckCircleIcon size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-5 max-w-xl">
          <AlertCircleIcon size={16} />
          {errorMsg}
        </div>
      )}

      {/* Stat Cards */}
      <div className="flex flex-wrap gap-5 my-6">
        <div className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
          <div className="flex flex-col gap-3 text-xs">
            <p>Total Balance</p>
            <b className="text-2xl font-medium text-slate-700">
              {fmt(total, currencySymbol)}
            </b>
          </div>
          <WalletIcon
            size={50}
            className="w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full"
          />
        </div>
        <div className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
          <div className="flex flex-col gap-3 text-xs">
            <p>Available Balance</p>
            <b className="text-2xl font-medium text-slate-700">
              {fmt(available, currencySymbol)}
            </b>
          </div>
          <CheckCircleIcon
            size={50}
            className="w-11 h-11 p-2.5 text-emerald-500 bg-emerald-50 rounded-full"
          />
        </div>
        <div className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg">
          <div className="flex flex-col gap-3 text-xs">
            <p>Pending Balance</p>
            <b className="text-2xl font-medium text-slate-700">
              {fmt(pending, currencySymbol)}
            </b>
          </div>
          <ClockIcon
            size={50}
            className="w-11 h-11 p-2.5 text-amber-500 bg-amber-50 rounded-full"
          />
        </div>
      </div>

      {/* Payout Settings */}
      <h2 className="text-xl text-slate-500 mb-3">
        Payout <span className="text-slate-800 font-medium">Settings</span>
      </h2>
      <div className="max-w-xl flex flex-col gap-2 mb-8">
        <div className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">Bank Account</p>
            <p className="text-sm font-medium text-slate-800">
              {bankDetails?.bankLast4
                ? `${bankDetails.bankName} ••••${bankDetails.bankLast4}`
                : "Not connected"}
            </p>
          </div>
          <button
            onClick={() => setShowBankModal(true)}
            className="text-sm border border-slate-300 rounded-lg px-4 py-1.5 text-slate-600 hover:bg-slate-50 transition active:scale-95"
          >
            {bankDetails?.bankLast4 ? "Update" : "Add"}
          </button>
        </div>
        <div className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">Request Payout</p>
            <p className="text-sm font-medium text-slate-800">
              Available: {fmt(available, currencySymbol)}
            </p>
          </div>
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={available <= 0}
            className="text-sm border border-slate-300 rounded-lg px-4 py-1.5 text-slate-600 hover:bg-slate-50 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Request
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="flex items-center justify-between mb-3 max-w-4xl">
        <h2 className="text-xl text-slate-500">
          Transaction{" "}
          <span className="text-slate-800 font-medium">History</span>
        </h2>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2 py-1.5 text-gray-600 outline-none"
        >
          <option value="ALL">All Types</option>
          <option value="SALE_CREDIT">Sale Credit</option>
          <option value="SHIPPING_DEBIT">Shipping Fee</option>
          <option value="COD_PENDING_CREDIT">COD Pending</option>
          <option value="COD_RELEASE">COD Released</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
      </div>

      {filteredTx.length === 0 ? (
        <p className="text-sm text-slate-500">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-4xl">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Type
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Bucket
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Amount
                </th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTx.map((tx) => {
                const amount = Number(tx.amount);
                const isCredit = amount >= 0;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-800">
                      <span className="bg-[#2582eb]/10 text-[#2582eb] text-xs px-2 py-1 rounded-full">
                        {TX_META[tx.type]?.label ?? tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <span
                        className={
                          tx.bucket === "AVAILABLE"
                            ? "bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-full"
                            : "bg-amber-50 text-amber-600 text-xs px-2 py-1 rounded-full"
                        }
                      >
                        {tx.bucket === "AVAILABLE" ? "Available" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          isCredit
                            ? "font-medium text-emerald-600"
                            : "font-medium text-rose-500"
                        }
                      >
                        {isCredit ? "+" : ""}
                        {fmt(amount, currencySymbol)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-5 max-w-xl">
        📌 Earnings are held for 7 days before becoming available. Returns
        within this window are automatically processed — no action needed.
      </p>

      {/* Modals */}
      {showPayoutModal && (
        <PayoutModal
          available={available}
          currency={currency}
          onClose={() => setShowPayoutModal(false)}
          onSuccess={handlePayoutRequest}
        />
      )}
      {showBankModal && (
        <BankDetailsModal
          storeId={storeId}
          onClose={() => setShowBankModal(false)}
          onSuccess={handleBankDetailsSuccess}
        />
      )}
    </div>
  );
}
