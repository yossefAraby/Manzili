"use client";
import Image from "next/image";
import { DotIcon, Star } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import { getCurrencySymbol } from "@/lib/currency";
import { requestReturn, simulateAdvanceOrder } from "@/lib/api/orders";
import { useTranslate } from '@/lib/i18n/LocaleContext';
import TrackingTimeline from "@/components/TrackingTimeline";
import OrderStages from "@/components/OrderStages";

function getItemImage(item) {
  const fromProduct =
    item?.product?.images?.[0]?.src ||
    item?.product?.images?.[0] ||
    item?.image ||
    null;
  return fromProduct || "/favicon.ico";
}

function formatStatus(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase();
}

const OrderItem = ({ order, onAdvance }) => {
  const currency = getCurrencySymbol();
  const t = useTranslate();
  const [ratingModal, setRatingModal] = useState(null);
  const [returnState, setReturnState] = useState("idle"); // 'idle' | 'confirming' | 'loading' | 'done' | 'error'
  const [returnError, setReturnError] = useState("");
  const [simulating, setSimulating] = useState(false);

  const { ratings } = useSelector((state) => state.rating);

  // Primary line-item to review: keep it simple → the first item that carries a
  // product id. Used by the "Leave a review" affordance shown on a delivered order.
  const primaryItem = (order.orderItems || []).find((it) => it?.product?.id);
  const primaryProductId = primaryItem?.product?.id || null;
  const primaryAlreadyRated =
    primaryProductId &&
    ratings.some(
      (r) => r.orderId === order.id && r.productId === primaryProductId,
    );

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

  // DEV-ONLY demo: walk this order Placed → Shipped → Delivered one step at a
  // time, refreshing the list after each step so the timeline visibly moves.
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
    } catch {
      /* non-fatal in a demo — the list refresh reflects whatever landed */
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <tr className="text-sm">
        <td className="text-left">
          <div className="flex flex-col gap-6">
            {(order.orderItems || []).map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
                  <Image
                    className="h-14 w-auto"
                    src={getItemImage(item)}
                    alt="product_img"
                    width={50}
                    height={50}
                  />
                </div>
                <div className="flex flex-col justify-center text-sm">
                  <p className="font-medium text-slate-600 text-base">
                    {item.product?.name || item.name}
                  </p>
                  <p>
                    {currency}
                    {item.price} {t('orderItem.qty', { qty: item.quantity })}
                  </p>
                  <p className="mb-1">
                    {new Date(order.createdAt).toDateString()}
                  </p>
                  <div>
                    {item?.product?.id &&
                    ratings.find(
                      (rating) =>
                        order.id === rating.orderId &&
                        item.product.id === rating.productId,
                    ) ? (
                      <Rating
                        value={
                          ratings.find(
                            (rating) =>
                              order.id === rating.orderId &&
                              item.product.id === rating.productId,
                          ).rating
                        }
                      />
                    ) : item?.product?.id ? (
                      <button
                        onClick={() =>
                          setRatingModal({
                            orderId: order.id,
                            productId: item.product.id,
                          })
                        }
                        className={`text-[#2582eb] hover:bg-[#2582eb]/10 transition ${order.status !== "DELIVERED" && "hidden"}`}
                      >
                        {t('orderItem.rateProduct')}
                      </button>
                    ) : null}
                  </div>
                  {ratingModal && (
                    <RatingModal
                      ratingModal={ratingModal}
                      setRatingModal={setRatingModal}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Return request — shows once per storeOrder, not per item */}
          {order.status === "DELIVERED" &&
            order.paymentMethod === "STRIPE" &&
            new Date() - new Date(order.createdAt) <
              7 * 24 * 60 * 60 * 1000 && (
              <div className="mt-3">
                {returnState === "idle" && (
                  <button
                    onClick={() => setReturnState("confirming")}
                    className="text-xs text-slate-500 border border-slate-200 rounded px-3 py-1 hover:bg-slate-50 transition"
                  >
                    {t('orderItem.requestReturn')}
                  </button>
                )}
                {returnState === "confirming" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-600">
                      {t('orderItem.areYouSure')}
                    </span>
                    <button
                      onClick={handleReturn}
                      className="text-xs text-rose-600 border border-rose-200 rounded px-3 py-1 hover:bg-rose-50 transition"
                    >
                      {t('orderItem.yesReturn')}
                    </button>
                    <button
                      onClick={() => setReturnState("idle")}
                      className="text-xs text-slate-500 border border-slate-200 rounded px-3 py-1 hover:bg-slate-50 transition"
                    >
                      {t('orderItem.cancel')}
                    </button>
                  </div>
                )}
                {returnState === "loading" && (
                  <span className="text-xs text-slate-400">
                    {t('orderItem.processingReturn')}
                  </span>
                )}
                {returnState === "done" && (
                  <span className="text-xs text-emerald-600">
                    {t('orderItem.returnRequested')}
                  </span>
                )}
                {returnState === "error" && (
                  <span className="text-xs text-rose-500">{returnError}</span>
                )}
              </div>
            )}
        </td>

        <td className="text-center max-md:hidden">
          {currency}
          {order.total}
        </td>

        <td className="text-left max-md:hidden">
          <p>
            {order.address.name}, {order.address.street},
          </p>
          <p>
            {order.address.city}, {order.address.state}, {order.address.zip},{" "}
            {order.address.country},
          </p>
          <p>{order.address.phone}</p>
        </td>

        <td className="text-left space-y-2 text-sm max-md:hidden">
          <div
            className={`flex items-center justify-center gap-1 rounded-full p-1 ${
              order.status === "DELIVERED"
                ? "text-[#2582eb] bg-[#2582eb]/10"
                : "text-slate-500 bg-slate-100"
            }`}
          >
            <DotIcon size={10} className="scale-250" />
            {formatStatus(order.status)}
          </div>
          {/* Always-visible lifecycle stepper so the buyer sees the full path from
              the start, even before a Bosta milestone exists. */}
          <div className="pt-1 pb-0.5">
            <OrderStages order={order} />
          </div>
          {order?.shipment && (
            <TrackingTimeline shipment={order.shipment} />
          )}
          {/* Demo control: one click walks the order to Delivered. Available on the live
              site too, since COD orders are never "paid" online and would otherwise sit at
              Order Placed — this lets a reviewer drive the full Bosta tracking lifecycle. */}
          {order.status !== "DELIVERED" &&
            order.status !== "CANCELED" &&
            order.status !== "RETURNED" && (
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="mt-1 text-xs text-[#2582eb] border border-[#2582eb]/30 rounded px-3 py-1 hover:bg-[#2582eb]/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {simulating
                  ? "Simulating…"
                  : "▶ Simulate delivery (demo)"}
              </button>
            )}
          {/* Buyer review affordance: prominent, Manzili-terracotta CTA shown once
              the order is delivered. Opens the existing RatingModal for the order's
              primary (first) product. Hidden once that product is already rated. */}
          {order.status === "DELIVERED" &&
            primaryProductId &&
            !primaryAlreadyRated && (
              <button
                onClick={() =>
                  setRatingModal({
                    orderId: order.id,
                    productId: primaryProductId,
                  })
                }
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#e67e22] hover:bg-[#d35400] rounded-full px-4 py-1.5 shadow-sm transition"
              >
                <Star size={13} className="fill-current" />
                {t('orderItem.leaveReview')}
              </button>
            )}
        </td>
      </tr>
      {/* Mobile */}
      <tr className="md:hidden">
        <td colSpan={5}>
          <p>
            {order.address.name}, {order.address.street}
          </p>
          <p>
            {order.address.city}, {order.address.state}, {order.address.zip},{" "}
            {order.address.country}
          </p>
          <p>{order.address.phone}</p>
          <br />
          <div className="flex items-center">
            <span className="text-center mx-auto px-6 py-1.5 rounded bg-[#2582eb]/10 text-[#2582eb]">
              {formatStatus(order.status)}
            </span>
          </div>
        </td>
      </tr>
      <tr>
        <td colSpan={4}>
          <div className="border-b border-slate-300 w-6/7 mx-auto" />
        </td>
      </tr>
    </>
  );
};

export default OrderItem;
