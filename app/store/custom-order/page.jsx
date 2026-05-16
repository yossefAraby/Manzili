"use client";

/**
 * Seller-side index of every custom-request they've sent a proposal on.
 *
 * Sourced entirely from the local offer store keyed by `sellerId`
 * (= session.userId — sellers don't strictly need a storeId to send
 * proposals, so we key off the account rather than the store record).
 *
 * For each offer we hydrate the parent request so the card can show the
 * item name / image / category. Offers without a hydratable request
 * (request deleted?) are filtered out — they would render as empty
 * skeletons and confuse the seller.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import {
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  PackageCheckIcon,
  ShieldOffIcon,
  ArrowRightIcon,
  LoaderIcon,
  Wallet2Icon,
  InboxIcon,
} from "lucide-react";
import Loading from "@/components/Loading";
import {
  OFFER_STATUS,
  listOffersBySellerId,
  getCustomRequestById,
} from "@/lib/services/localCustomRequestService";

const TABS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live", statuses: [OFFER_STATUS.PENDING, OFFER_STATUS.ACCEPTED, OFFER_STATUS.READY_TO_SHIP] },
  { id: "won", label: "Won", statuses: [OFFER_STATUS.ACCEPTED, OFFER_STATUS.READY_TO_SHIP, OFFER_STATUS.PAID] },
  { id: "lost", label: "Lost", statuses: [OFFER_STATUS.DECLINED, OFFER_STATUS.BLOCKED, OFFER_STATUS.SUPERSEDED] },
];

const STATUS_PRESENTATION = {
  [OFFER_STATUS.PENDING]: {
    label: "Pending response",
    chip: "bg-amber-100 text-amber-700",
    Icon: LoaderIcon,
  },
  [OFFER_STATUS.DECLINED]: {
    label: "Declined",
    chip: "bg-rose-100 text-rose-700",
    Icon: XCircleIcon,
  },
  [OFFER_STATUS.BLOCKED]: {
    label: "Blocked",
    chip: "bg-rose-100 text-rose-700",
    Icon: ShieldOffIcon,
  },
  [OFFER_STATUS.ACCEPTED]: {
    label: "Accepted",
    chip: "bg-emerald-100 text-emerald-700",
    Icon: CheckCircle2Icon,
  },
  [OFFER_STATUS.READY_TO_SHIP]: {
    label: "Ready to ship",
    chip: "bg-blue-100 text-blue-700",
    Icon: PackageCheckIcon,
  },
  [OFFER_STATUS.PAID]: {
    label: "Buyer paid",
    chip: "bg-emerald-100 text-emerald-700",
    Icon: Wallet2Icon,
  },
  [OFFER_STATUS.SUPERSEDED]: {
    label: "Buyer chose another",
    chip: "bg-slate-100 text-slate-600",
    Icon: XCircleIcon,
  },
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isDataUrl(src) {
  return typeof src === "string" && src.startsWith("data:");
}

export default function StoreCustomOrderPage() {
  const session = useSelector((s) => s.auth.session);
  const sellerId = session?.userId || null;

  const [loading, setLoading] = useState(true);
  // Each entry = { offer, request }. Built once on mount and re-built any
  // time the seller account changes.
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const fetchEntries = useCallback(async () => {
    if (!sellerId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const offers = await listOffersBySellerId(sellerId);
      const hydrated = await Promise.all(
        offers.map(async (offer) => {
          const request = await getCustomRequestById(offer.requestId);
          if (!request) return null;
          return { offer, request };
        }),
      );
      setEntries(hydrated.filter(Boolean));
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Counts power the tab badges so the seller sees at-a-glance how many
  // proposals are in each bucket without flipping tabs.
  const counts = useMemo(() => {
    const tally = { all: entries.length };
    for (const tab of TABS) {
      if (!tab.statuses) continue;
      tally[tab.id] = entries.filter((e) => tab.statuses.includes(e.offer.status)).length;
    }
    return tally;
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    if (!tab?.statuses) return entries;
    return entries.filter((e) => tab.statuses.includes(e.offer.status));
  }, [entries, activeTab]);

  if (loading) return <Loading />;

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl text-slate-500">
          Custom <span className="text-slate-800 font-medium">Orders</span>
        </h1>
        <Link
          href="/custom"
          className="inline-flex items-center gap-1.5 text-sm text-[#2582eb] hover:underline"
        >
          Browse open requests <ArrowRightIcon size={14} />
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visibleEntries.length === 0 ? (
        <EmptyState hasAny={entries.length > 0} activeTab={activeTab} />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleEntries.map(({ offer, request }) => (
            <OfferRow key={offer.id} offer={offer} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function OfferRow({ offer, request }) {
  const presentation = STATUS_PRESENTATION[offer.status] || STATUS_PRESENTATION[OFFER_STATUS.PENDING];
  const { Icon } = presentation;
  const heroImage =
    Array.isArray(request.images) && request.images.length > 0
      ? request.images[0]
      : "/placeholder.png";
  const currency = "$";

  return (
    <Link
      href={`/custom/negotiation/${request.id}`}
      className="group flex items-center gap-3 sm:gap-4 bg-white rounded-2xl border border-slate-100 hover:border-[#e67e22] hover:shadow-sm p-3 sm:p-4 transition-all active:scale-[0.99]"
    >
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
        <Image
          src={heroImage}
          alt={request.itemName || "Custom request"}
          fill
          sizes="80px"
          className="object-cover"
          unoptimized={isDataUrl(heroImage)}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="font-semibold text-slate-800 truncate">
            {request.itemName || "Custom request"}
          </p>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${presentation.chip}`}
          >
            <Icon size={11} />
            {presentation.label}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {request.user?.name ? `${request.user.name} · ` : ""}
          Sent {formatDate(offer.createdAt)}
          {offer.updatedAt && offer.updatedAt !== offer.createdAt
            ? ` · updated ${formatDate(offer.updatedAt)}`
            : ""}
        </p>
      </div>

      <div className="hidden sm:flex flex-col items-end shrink-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Your offer</p>
        <p className="text-base font-bold text-[#1c355e]">
          {currency} {Number(offer.price || 0).toLocaleString()}
        </p>
        <p className="text-[11px] text-slate-500">Due {formatDate(offer.deliveryDate)}</p>
      </div>

      <ArrowRightIcon
        size={18}
        className="text-slate-300 group-hover:text-[#e67e22] group-hover:translate-x-0.5 transition-all shrink-0"
      />
    </Link>
  );
}

function EmptyState({ hasAny, activeTab }) {
  // Two distinct empty states — "no proposals at all yet" vs. "no
  // proposals match this filter". The first one nudges toward /custom
  // (where they can submit a proposal); the second just hints at
  // switching tabs.
  if (!hasAny) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center">
        <InboxIcon className="mx-auto text-slate-300 mb-3" size={40} />
        <h2 className="text-lg font-semibold text-slate-700 mb-1">No proposals yet</h2>
        <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
          When you send a proposal on a custom request it lands here so you can keep track of
          where each negotiation stands.
        </p>
        <Link
          href="/custom"
          className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-full px-5 py-2.5 transition-colors"
        >
          Browse open requests <ArrowRightIcon size={16} />
        </Link>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center">
      <ClockIcon className="mx-auto text-slate-300 mb-3" size={40} />
      <h2 className="text-lg font-semibold text-slate-700 mb-1">
        Nothing in {activeTab === "live" ? "live" : activeTab === "won" ? "won" : "lost"} yet
      </h2>
      <p className="text-sm text-slate-500">Switch tabs to see your other proposals.</p>
    </div>
  );
}
