"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageTitle from "@/components/PageTitle";
import OrderItem from "@/components/OrderItem";
import ReportButton from "@/components/ReportButton";
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { fetchOrders } from "@/lib/api/orders";
import { confirmCheckout, confirmKashier } from "@/lib/api/checkout";

export default function Orders() {
  const t = useTranslate();
  const [orders, setOrders] = useState([]);

  // Re-fetch the order list (used after the dev simulate-delivery button so the
  // timeline visibly advances). Fail-safe: keeps the current list on error.
  const reloadOrders = async () => {
    const list = await fetchOrders();
    setOrders(Array.isArray(list) ? list : []);
  };

  // Load order history from the API (fail-safe → [] renders the empty state).
  // If we arrived here from a Stripe success redirect (?session_id=...), confirm
  // the payment server-side first so the order is marked paid + a Bosta shipment
  // is created before we render the list (works even without an inbound webhook).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const sessionId = params.get("session_id");
          const gateway = params.get("gateway");
          if (gateway === "kashier") {
            // Kashier redirect return: confirm server-side (verifies signature + fulfills).
            // Pass the RAW query string so the backend can verify over the original param order.
            const result = await confirmKashier(window.location.search).catch(() => null);
            if (!cancelled) {
              if (result?.status === "paid") toast.success("Payment confirmed — your order is being prepared.");
              else toast.error("Payment failed or canceled — the order was not completed.");
            }
            const url = new URL(window.location.href);
            ["session_id", "checkout", "gateway", "paymentStatus", "merchantOrderId", "orderId",
             "transactionId", "signature", "amount", "currency"].forEach((k) => url.searchParams.delete(k));
            window.history.replaceState({}, "", url.pathname + (url.search || ""));
          } else if (sessionId) {
            const result = await confirmCheckout(sessionId).catch(() => null);
            if (!cancelled) {
              if (result?.status === "paid") toast.success("Payment confirmed — your order is being prepared.");
              else if (result) toast("Finishing up your order…");
            }
            // Clean the query params so a refresh doesn't re-confirm.
            const url = new URL(window.location.href);
            url.searchParams.delete("session_id");
            url.searchParams.delete("checkout");
            window.history.replaceState({}, "", url.pathname + (url.search || ""));
          }
        }
      } catch {
        /* non-fatal — fall through to loading the list */
      }
      const list = await fetchOrders();
      if (!cancelled) setOrders(Array.isArray(list) ? list : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[70vh] mx-6">
      {orders.length > 0 ? (
        <div className="my-20 max-w-7xl mx-auto">
          <PageTitle
            heading={t('orders.title')}
            text={`Showing total ${orders.length} orders`}
            linkText={t('navbar.home')}
          />

          <table className="w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4">
            <thead>
              <tr className="max-sm:text-sm text-slate-600 max-md:hidden">
                <th className="text-left">Product</th>
                <th className="text-center">Total Price</th>
                <th className="text-left">{t('orderSummary.address')}</th>
                <th className="text-left">{t('orders.status')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <OrderItem
                    order={{
                      ...order,
                      user: { name: "You", email: "" },
                    }}
                    onAdvance={reloadOrders}
                  />
                  {order.status === "DELIVERED" && (
                    <tr key={order.id + "-report"}>
                      <td colSpan={4} className="pb-2 pl-2">
                        <ReportButton
                          type="SELLER_MISCONDUCT"
                          storeId={order.storeId}
                          storeOrderId={order.id}
                          label={t('reportButton.report')}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
          <h1 className="text-2xl sm:text-4xl font-semibold">
            {t('orders.empty')}
          </h1>
        </div>
      )}
    </div>
  );
}
