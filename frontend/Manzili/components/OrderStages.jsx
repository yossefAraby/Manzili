"use client";
// Always-visible canonical order lifecycle stepper for the buyer.
//
// Unlike <TrackingTimeline>, which only renders once a Bosta shipment + events
// exist, this shows the full Placed → Preparing → Shipped → Delivered path from
// the moment the order is created, highlighting how far along it is. The detailed
// Bosta event timeline (when present) still renders below it.

import { useTranslate } from "@/lib/i18n/LocaleContext";

const STAGES = ["placed", "preparing", "shipped", "delivered"];

// Map an order/shipment status onto the active stage index. Prefers the live
// Bosta shipment status when present, else the order status.
function activeIndex(order) {
  const ship = String(order?.shipment?.status || "").toUpperCase();
  const ord = String(order?.status || "").toUpperCase();
  const s = ship || ord;
  if (["DELIVERED", "COMPLETED"].includes(s)) return 3;
  if (["SHIPPED", "IN_TRANSIT", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(s)) return 2;
  if (["CONFIRMED", "PREPARING", "PACKED", "READY", "READY_TO_SHIP", "ACCEPTED", "PROCESSING"].includes(s)) return 1;
  return 0; // ORDER_PLACED / PENDING_PAYMENT / unknown
}

export default function OrderStages({ order }) {
  const t = useTranslate();
  const ord = String(order?.status || "").toUpperCase();
  const ship = String(order?.shipment?.status || "").toUpperCase();
  const isCanceled = ["CANCELED", "CANCELLED", "FAILED"].includes(ord) || ["CANCELED", "CANCELLED", "FAILED"].includes(ship);
  const isReturned = ord.startsWith("RETURN");

  if (isCanceled || isReturned) {
    return (
      <div
        className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
          isCanceled ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-current" />
        {isCanceled ? t("orderStages.canceled") : t("orderStages.returned")}
      </div>
    );
  }

  const idx = activeIndex(order);

  return (
    <ol className="flex items-start">
      {STAGES.map((key, i) => {
        const done = i < idx;
        const current = i === idx;
        const reached = i <= idx;
        return (
          <li key={key} className="flex-1 flex flex-col items-center min-w-0">
            <div className="flex items-center w-full">
              <span className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : i <= idx ? "bg-[#2582eb]" : "bg-slate-200"}`} />
              <span
                className={`h-3 w-3 shrink-0 rounded-full transition-colors ${
                  current
                    ? "bg-[#2582eb] ring-4 ring-[#2582eb]/20"
                    : done
                      ? "bg-[#2582eb]"
                      : "bg-slate-300"
                }`}
              />
              <span className={`h-0.5 flex-1 ${i === STAGES.length - 1 ? "opacity-0" : i < idx ? "bg-[#2582eb]" : "bg-slate-200"}`} />
            </div>
            <span
              className={`mt-1 text-center text-[10px] leading-tight px-0.5 ${
                reached ? "text-[#1c355e] font-medium" : "text-slate-400"
              }`}
            >
              {t(`orderStages.${key}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
