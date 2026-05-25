"use client";
import PageTitle from "@/components/PageTitle";
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";
import ReportButton from "@/components/ReportButton";
import { useDispatch } from "react-redux";
import { setRatings } from "@/lib/features/rating/ratingSlice";
import { useTranslate } from '@/lib/i18n/LocaleContext'

export default function Orders() {
  const t = useTranslate();
  const [orders, setOrders] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (!cancelled) setOrders(Array.isArray(data?.orders) ? data.orders : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load existing ratings from the API into Redux
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/ratings");
      const data = await res.json();
      if (!cancelled && Array.isArray(data?.ratings)) {
        dispatch(setRatings(data.ratings));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

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
              {orders.map((order) =>
                (order.storeOrders || []).map((storeOrder) => (
                  <>
                    <OrderItem
                      order={{
                        id: storeOrder.id,
                        total: storeOrder.total,
                        status: storeOrder.status,
                        paymentMethod: storeOrder.paymentMethod,
                        isPaid: storeOrder.isPaid,
                        createdAt: storeOrder.createdAt,
                        updatedAt: storeOrder.updatedAt,
                        isCouponUsed: order.isCouponUsed,
                        coupon: order.coupon,
                        orderItems: storeOrder.orderItems,
                        address: order.address,
                        user: { name: "You", email: "" },
                        shipment: storeOrder.shipment,
                        store: storeOrder.store,
                      }}
                      key={storeOrder.id}
                    />
                    {storeOrder.status === "DELIVERED" && (
                      <tr key={storeOrder.id + "-report"}>
                        <td colSpan={4} className="pb-2 pl-2">
                          <ReportButton
                            type="SELLER_MISCONDUCT"
                            storeId={storeOrder.storeId}
                            storeOrderId={storeOrder.id}
                            label={t('reportButton.report')}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                )),
              )}
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
