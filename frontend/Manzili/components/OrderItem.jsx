"use client";
import Image from "next/image";
import Link from "next/link";
import { Star, StoreIcon, MapPin, TruckIcon } from "lucide-react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import { getCurrencySymbol } from "@/lib/currency";
import { requestReturn, simulateAdvanceOrder } from "@/lib/api/orders";
import { useTranslate } from '@/lib/i18n/LocaleContext';
import TrackingTimeline from "@/components/TrackingTimeline";
import OrderStages from "@/components/OrderStages";

// Buyer's share of the Bosta delivery fee (the seller covers the other 65%). Mirrors the
// backend FeesOptions split so the card shows what the buyer actually paid for delivery.
const BUYER_SHIPPING_SHARE = 0.35;

function getItemImage(item) {
  return (
    item?.product?.images?.[0]?.src ||
    item?.product?.images?.[0] ||
    item?.image ||
    "/favicon.ico"
  );
}

function formatStatus(status) {
  return String(status || "").replace(/_/g, " ").toLowerCase();
}

const STATUS_PILL = {
  DELIVERED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  SHIPPED: "text-[#2582eb] bg-[#2582eb]/10 border-[#2582eb]/20",
  PROCESSING: "text-amber-700 bg-amber-50 border-amber-200",
  CANCELED: "text-rose-600 bg-rose-50 border-rose-200",
  RETURNED: "text-slate-600 bg-slate-100 border-slate-200",
};

const OrderItem = ({ order, onAdvance }) => {
  const currency = getCurrencySymbol();
  const t = useTranslate();
  const [ratingModal, setRatingModal] = useState(null);
  const [returnState, setReturnState] = useState("idle");
  const [returnError, setReturnError] = useState("");
  const [simulating, setSimulating] = useState(false);

  const { ratings } = useSelector((state) => state.rating);

  const primaryItem = (order.orderItems || []).find((it) => it?.product?.id);
  const primaryProductId = primaryItem?.product?.id || null;
  const primaryAlreadyRated =
    primaryProductId &&
    ratings.some((r) => r.orderId === order.id && r.productId === primaryProductId);

  const a = order.address || {};
  const addressLine = [a.street, a.district || a.zone, a.city].filter(Boolean).join(", ");
  const buyerDelivery = Number(order.shippingTotal || 0) * BUYER_SHIPPING_SHARE;
  const createdLabel = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "";
  const pill = STATUS_PILL[order.status] || "text-slate-600 bg-slate-100 border-slate-200";

  const handleReturn = async () => {
    setReturnState("loading");
    try {
      await requestReturn(order.id, t('orderItem.customerRequestedReturn'));
      setReturnState("done");
    } catch (err) {
      setReturnError(err?.message || t('orderItem.somethingWentWrong'));
      setReturnState("error");
    }
  };

  // DEV/demo: walk this order Placed → Shipped → Delivered, refreshing after each step.
  const handleSimulate = async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      let status = order.status;
      let guard = 0;
      while (status !== "DELIVERED" && guard < 6) {
        guard += 1;
        status = (await simulateAdvanceOrder(order.id)) || status;
        if (typeof onAdvance === "function") await onAdvance();
        if (status === "DELIVERED") break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (err) {
      // Surface the failure instead of a dead button — otherwise a backend hiccup looks like
      // "nothing happens" on click.
      toast.error(err?.message || t('orderItem.somethingWentWrong'));
    } finally {
      setSimulating(false);
    }
  };

  const canReturn =
    order.status === "DELIVERED" &&
    order.paymentMethod === "STRIPE" &&
    new Date() - new Date(order.createdAt) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header — vendor + order ref + status. Each vendor in a multi-vendor order is its own card. */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-[#faf8f5]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-full bg-[#1c355e]/5 flex items-center justify-center shrink-0">
            <StoreIcon size={18} className="text-[#1c355e]" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{order.storeName || "Manzili seller"}</p>
            <p className="text-xs text-slate-400">
              {t('orders.title')} #{order.id}{createdLabel ? ` · ${createdLabel}` : ""}
            </p>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-medium capitalize border rounded-full px-3 py-1 ${pill}`}>
          {formatStatus(order.status)}
        </span>
      </div>

      {/* Stacks vertically on mobile/tablet; side-by-side (items | delivery) only on
          desktop (lg+). Below lg the fixed 300px sidebar would overflow the card —
          and the card clips (overflow-hidden) — so it would get cut off. */}
      <div className="grid lg:grid-cols-[1fr_300px]">
        {/* Items */}
        <div className="p-5 space-y-4 lg:border-r border-slate-100">
          {(order.orderItems || []).map((item, index) => {
            const rated = item?.product?.id
              ? ratings.find((r) => r.orderId === order.id && r.productId === item.product.id)
              : null;
            const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            return (
              <div key={index} className="flex items-start gap-3">
                <div className="w-16 h-16 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                  <Image className="h-12 w-auto object-contain" src={getItemImage(item)} alt="" width={48} height={48} />
                </div>
                <div className="min-w-0 flex-1">
                  {item?.product?.id ? (
                    <Link
                      href={`/product/${item.product.id}`}
                      className="font-medium text-slate-700 truncate block hover:text-[#1c355e] hover:underline transition-colors"
                    >
                      {item.product?.name || item.name}
                    </Link>
                  ) : (
                    <p className="font-medium text-slate-700 truncate">{item.product?.name || item.name}</p>
                  )}
                  <p className="text-sm text-slate-500">
                    {currency}{item.price} · {t('orderItem.qty', { qty: item.quantity })}
                  </p>
                  {item?.product?.id && (
                    <Link
                      href={`/product/${item.product.id}`}
                      className="inline-block mt-1 text-xs text-[#2582eb] hover:underline"
                    >
                      {t('orderItem.viewProduct')}
                    </Link>
                  )}
                  {rated ? (
                    <div className="mt-1"><Rating value={rated.rating} /></div>
                  ) : item?.product?.id && order.status === "DELIVERED" ? (
                    <button
                      onClick={() => setRatingModal({ orderId: order.id, productId: item.product.id })}
                      className="mt-1 text-xs text-[#2582eb] hover:underline"
                    >
                      {t('orderItem.rateProduct')}
                    </button>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-slate-700 shrink-0">{currency}{lineTotal}</p>
              </div>
            );
          })}

          {/* Order total + return request */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">{t('orderSummary.paymentSummary')}</span>
            <span className="font-semibold text-slate-800">{currency}{order.total}</span>
          </div>

          {canReturn && (
            <div>
              {returnState === "idle" && (
                <button onClick={() => setReturnState("confirming")} className="text-xs text-slate-500 border border-slate-200 rounded px-3 py-1 hover:bg-slate-50 transition">
                  {t('orderItem.requestReturn')}
                </button>
              )}
              {returnState === "confirming" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-600">{t('orderItem.areYouSure')}</span>
                  <button onClick={handleReturn} className="text-xs text-rose-600 border border-rose-200 rounded px-3 py-1 hover:bg-rose-50 transition">{t('orderItem.yesReturn')}</button>
                  <button onClick={() => setReturnState("idle")} className="text-xs text-slate-500 border border-slate-200 rounded px-3 py-1 hover:bg-slate-50 transition">{t('orderItem.cancel')}</button>
                </div>
              )}
              {returnState === "loading" && <span className="text-xs text-slate-400">{t('orderItem.processingReturn')}</span>}
              {returnState === "done" && <span className="text-xs text-emerald-600">{t('orderItem.returnRequested')}</span>}
              {returnState === "error" && <span className="text-xs text-rose-500">{returnError}</span>}
            </div>
          )}
        </div>

        {/* Delivery + tracking — each vendor ships separately, so each card has its own. */}
        <div className="p-5 space-y-3 bg-slate-50/60">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1.5">
              <TruckIcon size={13} /> {t('orderSummary.address') /* Delivery */}
            </p>
            {a.name && <p className="text-sm text-slate-700">{a.name}</p>}
            {addressLine && (
              <p className="text-sm text-slate-500 flex items-start gap-1">
                <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" /> {addressLine}
              </p>
            )}
            {a.phone && <p className="text-xs text-slate-400 mt-0.5">{a.phone}</p>}
            {buyerDelivery > 0 && (
              <p className="text-xs text-slate-500 mt-1.5">
                {t('orderSummary.cod') ? null : null}
                Delivery: <span className="font-medium text-slate-700">{currency}{buyerDelivery.toFixed(2)}</span>
              </p>
            )}
          </div>

          <div className="pt-1">
            <OrderStages order={order} />
          </div>
          {order?.shipment && <TrackingTimeline shipment={order.shipment} />}

          {order.status !== "DELIVERED" && order.status !== "CANCELED" && order.status !== "RETURNED" && (
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full text-xs text-[#2582eb] border border-[#2582eb]/30 rounded-lg px-3 py-1.5 hover:bg-[#2582eb]/10 transition disabled:opacity-50"
            >
              {simulating ? "Simulating…" : "▶ Simulate delivery (demo)"}
            </button>
          )}

          {order.status === "DELIVERED" && primaryProductId && !primaryAlreadyRated && (
            <button
              onClick={() => setRatingModal({ orderId: order.id, productId: primaryProductId })}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-[#e67e22] hover:bg-[#d35400] rounded-full px-4 py-2 shadow-sm transition"
            >
              <Star size={13} className="fill-current" />
              {t('orderItem.leaveReview')}
            </button>
          )}
        </div>
      </div>

      {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
    </div>
  );
};

export default OrderItem;
