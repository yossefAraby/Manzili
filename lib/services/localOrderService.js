import { STORAGE_KEYS, makeEntityId, readStorageItems, writeStorageEnvelope } from "@/lib/storage/localStorageEnvelope";

const ORDER_STATUSES = ["ORDER_PLACED", "PROCESSING", "SHIPPED", "DELIVERED"];

function nowIso() {
  return new Date().toISOString();
}

function buildOrderItems(orderId, items = []) {
  return items.map((item) => ({
    id: makeEntityId("oit"),
    orderId,
    productId: item.id,
    quantity: item.quantity,
    price: item.price,
    product: item,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
}

export async function listOrders() {
  return readStorageItems(STORAGE_KEYS.ORDERS) || [];
}

export async function createOrderFromCart({ items, address, paymentMethod = "COD", coupon = null, paid = false }) {
  const orders = readStorageItems(STORAGE_KEYS.ORDERS) || [];
  const orderItems = readStorageItems(STORAGE_KEYS.ORDER_ITEMS) || [];
  const orderId = makeEntityId("ord");
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = coupon?.discountAmount || 0;
  const total = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

  const createdOrderItems = buildOrderItems(orderId, items);
  const order = {
    id: orderId,
    total,
    status: "ORDER_PLACED",
    paymentMethod,
    isPaid: paid,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    address,
    coupon: coupon ? { ...coupon } : null,
    orderItems: createdOrderItems,
  };

  writeStorageEnvelope(STORAGE_KEYS.ORDERS, [order, ...orders]);
  writeStorageEnvelope(STORAGE_KEYS.ORDER_ITEMS, [...createdOrderItems, ...orderItems]);
  return order;
}

export async function updateOrderStatus(orderId, nextStatus) {
  const list = readStorageItems(STORAGE_KEYS.ORDERS) || [];
  const index = list.findIndex((order) => order.id === orderId);
  if (index < 0) return null;

  const currentStatus = list[index].status;
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus);
  const nextIndex = ORDER_STATUSES.indexOf(nextStatus);
  if (nextIndex === -1 || nextIndex !== currentIndex + 1) {
    throw new Error("Invalid status transition");
  }

  const updated = {
    ...list[index],
    status: nextStatus,
    updatedAt: nowIso(),
  };

  list[index] = updated;
  writeStorageEnvelope(STORAGE_KEYS.ORDERS, list);
  return updated;
}
