/**
 * Notification helper specialized for the custom-order flow.
 *
 * The base localNotificationService is dumb: it only knows how to push a
 * row into localStorage. This module owns:
 *
 *   - the *templates* (title / message / href / type) for each lifecycle
 *     event, in one place so they stay consistent across the seller and
 *     buyer surfaces
 *   - the *dispatch* glue, so a single call here writes to localStorage
 *     AND adds the notification to the recipient's redux list IF they
 *     happen to be the active user in this browser tab
 *
 * Why both? localStorage is the persistence layer (the row survives
 * across sessions / tabs / users), but the bell reads from redux. If we
 * only persisted, the buyer would never see the badge update until the
 * next reload — bad UX. Dispatching ALSO when the recipient is the
 * current user closes that gap.
 */

import { pushNotification } from "@/lib/services/localNotificationService";
import { addNotification } from "@/lib/features/notification/notificationSlice";

/** Notify exactly one user. `dispatch`, `currentUserId` are optional —
 *  when present, the redux list updates instantly if the recipient is
 *  also the active user. */
function notify({ recipientUserId, dispatch, currentUserId, ...rest }) {
  if (!recipientUserId) return null;
  const payload = pushNotification({ userId: recipientUserId, ...rest });
  if (dispatch && currentUserId && currentUserId === recipientUserId) {
    dispatch(addNotification(payload));
  }
  return payload;
}

const VIEW_HREF = (requestId) => `/custom/request-view/${requestId}`;
const NEGOTIATION_HREF = (requestId) => `/custom/negotiation/${requestId}`;

/** Seller sent (or resent) a proposal → notify the buyer. */
export function notifyProposalSent({
  buyerUserId,
  sellerName,
  requestId,
  itemName,
  isResend,
  dispatch,
  currentUserId,
}) {
  return notify({
    recipientUserId: buyerUserId,
    dispatch,
    currentUserId,
    type: "custom_proposal",
    title: isResend ? "Updated proposal" : "New proposal",
    message: `${sellerName || "A seller"} ${isResend ? "resent" : "sent"} a proposal for "${itemName || "your request"}".`,
    href: VIEW_HREF(requestId),
  });
}

/** Buyer accepted → notify the seller. */
export function notifyOfferAccepted({
  sellerUserId,
  buyerName,
  requestId,
  itemName,
  dispatch,
  currentUserId,
}) {
  return notify({
    recipientUserId: sellerUserId,
    dispatch,
    currentUserId,
    type: "custom_accepted",
    title: "Proposal accepted",
    message: `${buyerName || "The buyer"} accepted your proposal for "${itemName || "the request"}". Chat is now open.`,
    href: NEGOTIATION_HREF(requestId),
  });
}

/** Buyer declined → notify the seller. */
export function notifyOfferDeclined({
  sellerUserId,
  buyerName,
  requestId,
  itemName,
  dispatch,
  currentUserId,
}) {
  return notify({
    recipientUserId: sellerUserId,
    dispatch,
    currentUserId,
    type: "custom_declined",
    title: "Proposal declined",
    message: `${buyerName || "The buyer"} declined your proposal for "${itemName || "the request"}". You can resend an updated one.`,
    href: NEGOTIATION_HREF(requestId),
  });
}

/** Buyer blocked → notify the seller (terminal). */
export function notifyOfferBlocked({
  sellerUserId,
  buyerName,
  requestId,
  itemName,
  dispatch,
  currentUserId,
}) {
  return notify({
    recipientUserId: sellerUserId,
    dispatch,
    currentUserId,
    type: "custom_blocked",
    title: "Proposals blocked",
    message: `${buyerName || "The buyer"} blocked further proposals on "${itemName || "the request"}".`,
    href: NEGOTIATION_HREF(requestId),
  });
}

/** Seller marked ready to ship → notify the buyer. */
export function notifyReadyToShip({
  buyerUserId,
  sellerName,
  requestId,
  itemName,
  dispatch,
  currentUserId,
}) {
  return notify({
    recipientUserId: buyerUserId,
    dispatch,
    currentUserId,
    type: "custom_ready",
    title: "Order ready to ship",
    message: `${sellerName || "Your seller"} marked "${itemName || "your order"}" as ready. Add an address and pay to finalize.`,
    href: VIEW_HREF(requestId),
  });
}

/** Buyer paid → notify the seller. */
export function notifyOrderPaid({
  sellerUserId,
  buyerName,
  requestId,
  itemName,
  dispatch,
  currentUserId,
}) {
  return notify({
    recipientUserId: sellerUserId,
    dispatch,
    currentUserId,
    type: "custom_paid",
    title: "Buyer paid",
    message: `${buyerName || "The buyer"} paid for "${itemName || "the order"}". Ship to the saved address.`,
    href: NEGOTIATION_HREF(requestId),
  });
}
