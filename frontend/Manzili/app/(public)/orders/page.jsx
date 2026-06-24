"use client";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PageTitle from "@/components/PageTitle";
import OrderItem from "@/components/OrderItem";
import ReportButton from "@/components/ReportButton";
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { fetchOrders } from "@/lib/api/orders";
import { confirmCheckout, confirmKashier } from "@/lib/api/checkout";
import { clearCart } from "@/lib/features/cart/cartSlice";
import { selectSession, selectAuthBootstrapped } from "@/lib/features/auth/authSlice";

export default function Orders() {
  const t = useTranslate();
  const dispatch = useDispatch();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // Gate the first fetch on the cookie-session having rehydrated, so /orders doesn't render
  // an empty list on a cold load (the bug where it needed a manual refresh to populate).
  const session = useSelector(selectSession);
  const bootstrapped = useSelector(selectAuthBootstrapped);

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
    if (!bootstrapped) return undefined; // wait for the session cookie to rehydrate first
    // Orders are per-user — a guest has none. Once the session has settled and there's still no
    // user, send them to login (the backend already scopes orders to the authenticated buyer).
    if (!session?.userId) { router.replace('/login?next=/orders'); return undefined; }
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
              if (result?.status === "paid") {
                dispatch(clearCart()); // order paid → empty the cart immediately (backend clears the server copy)
                toast.success("Payment confirmed — your order is being prepared.");
              } else if (result) {
                toast.error("Payment failed or canceled — the order was not completed.");
              } else {
                // confirm threw (not an explicit unpaid) — never hard-fail an approved payment.
                toast("We're confirming your payment — it'll appear here shortly.");
              }
            }
            const url = new URL(window.location.href);
            ["session_id", "checkout", "gateway", "paymentStatus", "merchantOrderId", "orderId",
             "transactionId", "signature", "amount", "currency"].forEach((k) => url.searchParams.delete(k));
            window.history.replaceState({}, "", url.pathname + (url.search || ""));
          } else if (sessionId) {
            const result = await confirmCheckout(sessionId).catch(() => null);
            if (!cancelled) {
              if (result?.status === "paid") {
                dispatch(clearCart()); // order paid → empty the cart immediately (backend clears the server copy)
                toast.success("Payment confirmed — your order is being prepared.");
              } else if (result) {
                toast("Finishing up your order…");
              }
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
      if (!cancelled) { setOrders(Array.isArray(list) ? list : []); setLoading(false); }
    })();
    return () => {
      cancelled = true;
    };
    // Re-run once the session rehydrates (bootstrapped) and whenever the user changes.
  }, [bootstrapped, session?.userId]);

  return (
    <div className="min-h-[70vh] mx-6">
      {loading ? (
        <div className="min-h-[80vh] flex items-center justify-center text-slate-400 text-sm">
          {t('common.loading')}
        </div>
      ) : orders.length > 0 ? (
        <div className="my-20 max-w-7xl mx-auto">
          <PageTitle
            heading={t('orders.title')}
            text={`Showing total ${orders.length} orders`}
            linkText={t('navbar.home')}
          />

          <div className="mt-8 flex flex-col gap-6">
            {orders.map((order) => (
              <div key={order.id}>
                <OrderItem
                  order={{ ...order, user: { name: "You", email: "" } }}
                  onAdvance={reloadOrders}
                />
                {order.status === "DELIVERED" && (
                  <div className="mt-2 pl-1">
                    <ReportButton
                      type="SELLER_MISCONDUCT"
                      storeId={order.storeId}
                      storeOrderId={order.id}
                      label={t('reportButton.report')}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
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
