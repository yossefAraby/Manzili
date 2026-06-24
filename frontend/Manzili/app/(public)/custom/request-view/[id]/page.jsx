"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { addRating } from "@/lib/features/rating/ratingSlice";
import {
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  CreditCardIcon,
  MapPinIcon,
  MicIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  ShieldOffIcon,
  SquarePenIcon,
  StoreIcon,
  UserIcon,
  XIcon,
  CheckCircle2Icon,
  StarIcon,
  PackageCheckIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import Avatar from "@/components/Avatar";
import AddressModal from "@/components/AddressModal";
import ReportButton from "@/components/ReportButton";
import TrackingTimeline from "@/components/TrackingTimeline";
import {
  OFFER_STATUS,
  fetchRequestById as apiFetchRequestById,
  fetchOffers as apiFetchOffers,
  transitionOffer,
  payOfferMilestone,
  createOfferCheckout,
  createOfferKashierPayment,
  confirmOfferKashier,
  sendOfferMessage,
  fetchOfferMessages,
  getMilestoneSchedule,
  getNextMilestone,
  getPaidTotal,
} from "@/lib/api/custom";
import { confirmCheckout } from "@/lib/api/checkout";
import { createRating } from "@/lib/api/ratings";
import { simulateAdvanceOrder } from "@/lib/api/orders";

// Mobile Wallet + Fawry (Kashier) payment options — shown only when configured for this deployment.
const KASHIER_ENABLED = process.env.NEXT_PUBLIC_KASHIER_ENABLED === 'true';

/** Buyer view of a custom request. See top-of-file comment in previous
 *  revision — layout = payment-top → chat → details-rail → proposals. */

function isDataUrl(src) {
  return typeof src === "string" && src.startsWith("data:");
}

function formatDate(value) {
  if (!value) return "No deadline";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function hasDimensions(size) {
  if (!size) return false;
  return Boolean(size.length || size.width || size.height);
}

function formatCountdown(targetIso) {
  if (!targetIso) return null;
  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
  if (diffDays === 0) return { label: "Due today", tone: "warn" };
  if (diffDays < 0)
    return { label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`, tone: "danger" };
  return { label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`, tone: diffDays <= 3 ? "warn" : "ok" };
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast.success(`Copied ${text}`);
  } catch {
    toast.error("Couldn't copy.");
  }
}

/** Convert persisted offer MESSAGES (the real chat) into chat lanes.
 *  Buyer (the local user) renders on the right ("buyer" sender). Images are
 *  preserved so seller progress-update photos render. */
function apiMessagesToLanes(apiMsgs) {
  return (apiMsgs || []).map((m) => ({
    id: m.id,
    sender: m.author === "buyer" ? "buyer" : "seller",
    type: "text",
    text: m.text,
    image: m.image || null,
    time: m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "",
  }));
}

// The buyer covers 35% of the ~50 EGP Bosta delivery fee (the seller covers the other 65%);
// the exact Stripe card fee is added by the backend at payment time.
const ESTIMATED_SHIPPING_FALLBACK = 17.5;

export default function RequestViewPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const requestId = params.id;
  const currency = "EGP";

  const session = useSelector((s) => s.auth.session);
  const currentUserId = session?.userId || null;
  const addressList = useSelector((s) => s.address.list);
  // Reviews left this session (same Redux slice OrderItem/RatingModal use) — lets the
  // review card recognise an already-reviewed custom order without a reload.
  const submittedRatings = useSelector((s) => s.rating.ratings);

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [activeImage, setActiveImage] = useState(0);

  // Triple-tap-to-block per offer.
  const [blockTaps, setBlockTaps] = useState({});
  const blockTimer = useRef(null);

  // Per-offer comment draft for the buyer's reply input.
  const [buyerComments, setBuyerComments] = useState({});

  // Payment card
  const [paymentMethod, setPaymentMethod] = useState("STRIPE");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // When Kashier (Mobile Wallet / Fawry) isn't configured for this deployment,
  // those radios never render — so the method can never be stuck on a hidden
  // value. Card (Stripe) is always available.
  useEffect(() => {
    if (!KASHIER_ENABLED && paymentMethod !== "STRIPE") {
      setPaymentMethod("STRIPE");
    }
  }, [paymentMethod]);

  // Chat
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState([]);

  // Custom-order review (shown once the order is DELIVERED). `reviewed` flips to true
  // after a successful submit so the card switches to the "thanks" state without a reload.
  const [reviewed, setReviewed] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // ---- loader ---------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!requestId) return;
    try {
      // API is the single source of truth for the request + its offers.
      const [raw, offerList] = await Promise.all([
        apiFetchRequestById(requestId),
        apiFetchOffers(requestId),
      ]);
      setRequest(raw);
      setOffers(offerList || []);
    } catch {
      toast.error("Failed to load request.");
    }
  }, [requestId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Returning from a Stripe portal (?session_id=...) → confirm the milestone
  // payment server-side (records it, and finalizes the order on the final
  // milestone), then refresh. Runs once.
  const confirmedRef = useRef(false);
  useEffect(() => {
    if (confirmedRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const gateway = params.get("gateway");
    if (!sessionId && gateway !== "kashier") return;
    confirmedRef.current = true;
    (async () => {
      if (gateway === "kashier") {
        // Kashier (Mobile Wallet / Fawry) milestone return — confirm server-side. The
        // milestone/amount/address rode back in the redirect query; pass the raw query for
        // signature verification.
        const result = await confirmOfferKashier(params.get("offerId"), {
          query: window.location.search,
          milestone: params.get("milestone"),
          amount: params.get("amount"),
          addressId: params.get("addressId"),
        }).catch(() => null);
        if (result?.status === "paid") toast.success("Payment confirmed — your custom order is being prepared.");
      } else {
        const result = await confirmCheckout(sessionId).catch(() => null);
        if (result?.status === "paid") toast.success("Payment confirmed — your custom order is being prepared.");
      }
      const url = new URL(window.location.href);
      ["session_id", "payment", "gateway", "offerId", "milestone", "amount", "addressId",
       "paymentStatus", "merchantOrderId", "orderId", "transactionId", "signature", "currency"]
        .forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
      refresh();
    })();
  }, [refresh]);

  // Decay block-tap counters.
  useEffect(() => {
    const hasAny = Object.values(blockTaps).some((n) => n > 0);
    if (!hasAny) return;
    blockTimer.current = setTimeout(() => setBlockTaps({}), 4000);
    return () => clearTimeout(blockTimer.current);
  }, [blockTaps]);

  // ---- derived --------------------------------------------------------------
  const isOwner = useMemo(() => {
    if (!request || !currentUserId) return false;
    return request.ownerUserId === currentUserId;
  }, [request, currentUserId]);

  const activeOffer = useMemo(
    () =>
      offers.find((o) =>
        [
          OFFER_STATUS.ACCEPTED,
          OFFER_STATUS.FIRST_PAID,
          OFFER_STATUS.PROGRESS_UPLOADED,
          OFFER_STATUS.SECOND_PAID,
          OFFER_STATUS.READY_TO_SHIP,
          OFFER_STATUS.PAID,
        ].includes(o.status),
      ) ?? null,
    [offers],
  );

  // The next milestone the buyer needs to settle (or null when it's the
  // seller's turn — i.e. status is *_paid awaiting progress / ready-to-ship).
  const nextMilestone = useMemo(
    () => (activeOffer ? getNextMilestone(activeOffer) : null),
    [activeOffer],
  );

  // If the buyer already reviewed this custom order's product this session, start in the
  // "thanks" state so the review form isn't shown again.
  useEffect(() => {
    const pid = activeOffer?.productId;
    if (!pid) return;
    const already = (submittedRatings || []).some((r) => String(r.productId) === String(pid));
    if (already) setReviewed(true);
  }, [activeOffer?.productId, submittedRatings]);
  const milestoneSchedule = useMemo(
    () => (activeOffer ? getMilestoneSchedule(activeOffer.price) : null),
    [activeOffer],
  );

  const inboundProposals = useMemo(() => {
    if (activeOffer) return [];
    return offers.filter(
      (o) =>
        o.status === OFFER_STATUS.PENDING ||
        o.status === OFFER_STATUS.DECLINED ||
        o.status === OFFER_STATUS.BLOCKED,
    );
  }, [offers, activeOffer]);

  const countdown = useMemo(() => (activeOffer ? formatCountdown(activeOffer.deliveryDate) : null), [activeOffer]);

  // The chat lives in the offer_messages table and is read via
  // fetchOfferMessages — NOT from offer.comments (which are just the scalar
  // accept/decline notes). Load the real persisted messages and re-set the
  // whole list from the server (plus the intro) so the optimistic temp row is
  // replaced by the persisted one and both sides stay in sync.
  const loadMessages = useCallback(async () => {
    if (!request) return;
    const intro = {
      id: "intro",
      sender: "buyer",
      type: "text",
      text: request.description || "No description provided.",
      time: "",
    };
    if (!activeOffer?.id) {
      setMessages([intro]);
      return;
    }
    const apiMsgs = await fetchOfferMessages(activeOffer.id);
    setMessages([intro, ...apiMessagesToLanes(apiMsgs)]);
  }, [request, activeOffer?.id]);

  // Initial seed whenever the request / active offer changes.
  useEffect(() => {
    if (!request) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadMessages();
    })();
    return () => {
      cancelled = true;
    };
  }, [request?.id, activeOffer?.id, loadMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Light polling (~5s) so the buyer sees the seller's replies + progress images
  // without a manual refresh. Keyed on the active offer id; paused when the tab
  // is hidden.
  useEffect(() => {
    if (!activeOffer?.id) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeOffer?.id, loadMessages]);

  // ---- handlers -------------------------------------------------------------
  const handleEdit = () => {
    router.push(`/custom/custom-form?edit=${encodeURIComponent(request.id)}`);
  };

  const handleAccept = async (offer) => {
    try {
      const buyerComment = (buyerComments[offer.id] || "").trim() || null;
      await transitionOffer(offer.id, "accept", buyerComment);
      await refresh();
      toast.success("Proposal accepted.");
    } catch {
      toast.error("Could not accept proposal.");
    }
  };

  const handleDecline = async (offer) => {
    try {
      const buyerComment = (buyerComments[offer.id] || "").trim() || null;
      await transitionOffer(offer.id, "decline", buyerComment);
      await refresh();
      toast("Proposal declined.");
    } catch {
      toast.error("Could not decline proposal.");
    }
  };

  const handleBlock = async (offer) => {
    const current = blockTaps[offer.id] || 0;
    if (current < 2) {
      setBlockTaps({ ...blockTaps, [offer.id]: current + 1 });
      return;
    }
    try {
      const buyerComment = (buyerComments[offer.id] || "").trim() || null;
      await transitionOffer(offer.id, "block", buyerComment);
      setBlockTaps({ ...blockTaps, [offer.id]: 0 });
      await refresh();
      toast("Seller blocked for this request.");
    } catch {
      toast.error("Could not block seller.");
    }
  };

  const handlePay = async () => {
    if (!activeOffer || !nextMilestone) return;
    // Address is only required for the final milestone — the moment the
    // buyer actually commits a destination. Earlier milestones are just
    // payment ticks (think wire transfer / Stripe charge, no shipping yet).
    const isFinal = nextMilestone.key === "final";
    if (isFinal && !selectedAddress) {
      toast.error("Please select or add a shipping address.");
      return;
    }
    // Mobile Wallet / Fawry → Kashier Hosted Payment Page (redirect). On return the page
    // confirms the milestone server-side (see the gateway=kashier effect below).
    if (paymentMethod === "WALLET" || paymentMethod === "FAWRY") {
      try {
        const { url } = await createOfferKashierPayment(activeOffer.id, {
          milestone: nextMilestone.key,
          addressId: isFinal ? selectedAddress?.id || null : null,
          method: paymentMethod === "FAWRY" ? "fawry" : "wallet",
        });
        if (url) {
          window.location.href = url;
          return;
        }
        throw new Error("no checkout url");
      } catch {
        toast.error("Could not start the payment. Please try again.");
      }
      return;
    }

    // Open a Stripe portal (managed by the backend), mirroring the cart checkout.
    // On success the backend records the milestone and — for the final one —
    // turns the offer into a real, Bosta-tracked order. The backend computes the
    // server-trusted amount, so we no longer send one.
    try {
      const { url } = await createOfferCheckout(activeOffer.id, {
        milestone: nextMilestone.key,
        addressId: isFinal ? selectedAddress?.id || null : null,
      });
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error("no checkout url");
    } catch (err) {
      // Only fall back to recording the milestone directly when the gateway is
      // genuinely unconfigured (503 / SERVICE_UNAVAILABLE). A real failure
      // (500 / network) must surface — recording a no-charge milestone here
      // would silently advance the order AND re-enter the same failing path.
      const gatewayUnavailable =
        err?.status === 503 || err?.code === "SERVICE_UNAVAILABLE";
      if (!gatewayUnavailable) {
        toast.error("Could not start the payment. Please try again.");
        return;
      }
      try {
        await payOfferMilestone(activeOffer.id, {
          milestone: nextMilestone.key,
          paymentMethod,
          addressId: isFinal ? selectedAddress?.id || null : null,
        });
        await refresh();
        toast.success(
          isFinal
            ? "Final payment cleared — order finalized."
            : nextMilestone.key === "first"
              ? "First payment cleared — the seller can start working."
              : "Second payment cleared — work continues.",
        );
      } catch {
        toast.error("Could not complete payment.");
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeOffer) return;
    const text = messageInput;
    setMessageInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "buyer",
        type: "text",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    try {
      await sendOfferMessage(activeOffer.id, { text });
      // Refetch so the optimistic temp row is replaced by the persisted one
      // (dedupe = re-set the whole list from the server + intro).
      await loadMessages();
    } catch {
      /* non-fatal — message is already on screen */
    }
  };

  // Submit the buyer's review of the delivered custom piece. Reuses the SAME product-review
  // endpoint standard orders use, against the custom order's placeholder product id.
  const handleSubmitReview = async ({ rating, review }) => {
    if (!activeOffer?.productId) {
      toast.error("This order can't be reviewed yet.");
      return;
    }
    try {
      const created = await createRating({
        productId: activeOffer.productId,
        orderId: activeOffer.orderId || null,
        rating,
        review,
      });
      // Record in the shared rating slice (same as RatingModal) so the reviewed state
      // survives navigation within the session.
      dispatch(addRating({ ...created, orderId: activeOffer.orderId || null, productId: activeOffer.productId }));
      setReviewed(true);
      toast.success("Thanks for your review!");
    } catch (err) {
      // Already reviewed (server 409) → treat as done rather than surfacing an error.
      if (err?.status === 409 || err?.code === "CONFLICT") {
        setReviewed(true);
        return;
      }
      throw err;
    }
  };

  // DEV-ONLY demo: walk the custom order Placed → Shipped → Delivered, mirroring the
  // standard-order OrderItem simulate button. Operates on the order's single store order.
  const handleSimulateDelivery = async () => {
    if (simulating || !activeOffer?.storeOrderId) return;
    setSimulating(true);
    try {
      let status = null;
      let guard = 0;
      while (status !== "DELIVERED" && guard < 6) {
        guard += 1;
        status = (await simulateAdvanceOrder(activeOffer.storeOrderId)) || status;
        await refresh();
        if (status === "DELIVERED") break;
        await new Promise((r) => setTimeout(r, 1200));
      }
    } catch {
      /* non-fatal in a demo — the refresh reflects whatever landed */
    } finally {
      setSimulating(false);
    }
  };

  // ---- render ---------------------------------------------------------------
  if (loading) return <Loading />;

  if (!request) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-slate-600 font-medium">Request not found.</p>
        <p className="text-slate-500 text-sm mt-2">It may have been removed, or the link is incorrect.</p>
        <button
          type="button"
          onClick={() => router.push("/custom")}
          className="mt-6 text-[#2582eb] font-medium hover:underline"
        >
          Browse custom requests
        </button>
      </div>
    );
  }

  const images = Array.isArray(request.images) ? request.images : [];
  const mainImage = images[activeImage] || images[0] || "/placeholder.png";
  const colors = Array.isArray(request.colors)
    ? request.colors.filter((c) => c && (c.hex || c.description))
    : [];
  const sizeKnown = hasDimensions(request.size);
  const isPackageSize = request.sizeMode === "package" && request.packageSize;

  // Card appears whenever a milestone is due. Shipping fee is folded into
  // the FINAL milestone only — earlier ticks are pure product payments.
  const showPaymentCard = Boolean(activeOffer && nextMilestone);
  const showPaidBanner = activeOffer && activeOffer.status === OFFER_STATUS.PAID;

  // Once the final milestone is paid, the offer becomes a real Bosta-tracked order:
  // the chat closes and the card becomes a TRACKING card → then a REVIEW card on delivery.
  const isPaid = activeOffer && activeOffer.status === OFFER_STATUS.PAID;
  const isDelivered = Boolean(isPaid && activeOffer.delivered);
  // Show the chat (+ its input) only while the order isn't finalized yet.
  const showChat = Boolean(activeOffer && !isPaid);

  const subtotal = activeOffer ? Number(activeOffer.price || 0) : 0;
  const total = subtotal + ESTIMATED_SHIPPING_FALLBACK;
  const paidSoFar = activeOffer ? getPaidTotal(activeOffer) : 0;

  return (
    <div className="min-h-screen bg-[#f4efe4] py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4">
          <button
            onClick={() => router.push("/custom")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeftIcon size={20} />
            <span className="font-medium">Back to Requests</span>
          </button>

          <div className="flex items-center gap-3">
            <ReportButton
              type="UNFULFILLED_CUSTOM_REQUEST"
              customRequestId={requestId}
              storeId={request?.storeId}
              label="Report"
              className="text-xs text-slate-400 hover:text-rose-500"
            />
            {isOwner && !activeOffer && (
              <button
                type="button"
                onClick={handleEdit}
                className="shine-once inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1c355e] hover:bg-[#2582eb] text-white text-sm font-medium shadow-md transition-colors"
              >
                <PencilIcon size={16} />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* PAYMENT CARD (top) */}
        {isOwner && showPaymentCard && (
          <PaymentCard
            request={request}
            activeOffer={activeOffer}
            currency={currency}
            subtotal={subtotal}
            total={total}
            paidSoFar={paidSoFar}
            milestone={nextMilestone}
            schedule={milestoneSchedule}
            addressList={addressList}
            selectedAddress={selectedAddress}
            setSelectedAddress={setSelectedAddress}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            session={session}
            router={router}
            setShowAddressModal={setShowAddressModal}
            onPay={handlePay}
          />
        )}

        {/* WAITING-ON-SELLER BANNER — buyer has paid their next milestone
            but the seller hasn't reached the next checkpoint yet. */}
        {isOwner &&
          activeOffer &&
          !nextMilestone &&
          activeOffer.status !== OFFER_STATUS.PAID && (
            <div className="card-enter mb-6 p-5 rounded-3xl bg-blue-50 border-2 border-blue-200 flex items-center gap-3 text-blue-800">
              <ClockIcon size={22} />
              <div className="min-w-0">
                <p className="font-semibold">
                  {activeOffer.status === OFFER_STATUS.FIRST_PAID
                    ? "First payment cleared — the seller is working."
                    : "Second payment cleared — the seller is finishing up."}
                </p>
                <p className="text-xs opacity-80">
                  You've paid {currency} {paidSoFar.toFixed(2)} of {currency}{" "}
                  {subtotal.toFixed(2)} so far. Watch this page for the next
                  milestone.
                </p>
              </div>
            </div>
          )}

        {isOwner && showPaidBanner && (
          <div className="card-enter mb-6 p-5 rounded-3xl bg-emerald-50 border-2 border-emerald-200 flex items-center gap-3 text-emerald-800">
            <CheckCircle2Icon size={22} />
            <div className="min-w-0">
              <p className="font-semibold">Order finalized.</p>
              <p className="text-xs opacity-80">
                Shipping to {activeOffer.shippingAddress?.name || "you"}. Total {currency}{" "}
                {total.toFixed(2)}.
              </p>
            </div>
          </div>
        )}

        {/* CHAT / TRACKING / REVIEW  +  DETAILS RAIL.
            - while the order is being negotiated/paid  → ChatCard (with input)
            - once fully paid (final milestone)         → chat closes; TRACKING card
            - once the shipment is DELIVERED            → REVIEW card (then "thanks") */}
        {isOwner && activeOffer && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {showChat ? (
              <ChatCard
                request={request}
                mainImage={mainImage}
                activeOffer={activeOffer}
                currency={currency}
                messages={messages}
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                onSubmit={handleSendMessage}
                buyer={{ name: request.user?.name || "You", image: request.user?.image }}
                seller={{ name: activeOffer.sellerName || "Seller", image: activeOffer.sellerLogo }}
              />
            ) : isDelivered ? (
              <ReviewCard
                activeOffer={activeOffer}
                reviewed={reviewed}
                onSubmit={handleSubmitReview}
                seller={{ name: activeOffer.sellerName || "Seller", image: activeOffer.sellerLogo }}
              />
            ) : (
              <TrackingCard
                activeOffer={activeOffer}
                currency={currency}
                simulating={simulating}
                onSimulate={handleSimulateDelivery}
                seller={{ name: activeOffer.sellerName || "Seller", image: activeOffer.sellerLogo }}
              />
            )}
            <div className="flex flex-col gap-6 h-auto lg:h-[750px] pb-2 order-1 lg:order-2">
              <div className="card-scrollbar bg-white rounded-3xl shadow-sm border border-slate-50 flex-1 min-h-0 overflow-y-auto">
                <CompactDetails
                  request={request}
                  images={images}
                  activeImage={activeImage}
                  setActiveImage={setActiveImage}
                  colors={colors}
                  sizeKnown={sizeKnown}
                  isPackageSize={isPackageSize}
                  countdown={countdown}
                  activeOffer={activeOffer}
                />
              </div>
            </div>
          </div>
        )}

        {/* DETAILS (full-width when no chat) */}
        {(!activeOffer || !isOwner) && (
          <div className="relative bg-white rounded-3xl shadow-sm border border-slate-50 overflow-hidden">
            <FullDetails
              request={request}
              images={images}
              activeImage={activeImage}
              setActiveImage={setActiveImage}
              colors={colors}
              sizeKnown={sizeKnown}
              isPackageSize={isPackageSize}
            />
          </div>
        )}

        {/* PROPOSALS */}
        {isOwner && inboundProposals.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 px-1">
              Proposals ({inboundProposals.length})
            </h2>
            {inboundProposals.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                currency={currency}
                blockTaps={blockTaps[p.id] || 0}
                comment={buyerComments[p.id] || ""}
                onCommentChange={(v) => setBuyerComments({ ...buyerComments, [p.id]: v })}
                onAccept={() => handleAccept(p)}
                onDecline={() => handleDecline(p)}
                onBlock={() => handleBlock(p)}
              />
            ))}
          </div>
        )}

        {isOwner && !activeOffer && inboundProposals.length === 0 && (
          <div className="mt-6 p-6 rounded-3xl bg-white border border-dashed border-slate-200 text-center text-sm text-slate-500">
            No proposals yet. Sellers will appear here as they respond.
          </div>
        )}
      </div>

      {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PaymentCard({
  request,
  activeOffer,
  currency,
  subtotal,
  total,
  paidSoFar,
  milestone,
  schedule,
  addressList,
  selectedAddress,
  setSelectedAddress,
  paymentMethod,
  setPaymentMethod,
  session,
  router,
  setShowAddressModal,
  onPay,
}) {
  // Headline + sub-headline copy depend on which milestone is up. Final
  // milestone bundles shipping; first/second are pure product payments.
  const isFinal = milestone?.key === "final";
  const header = (() => {
    if (milestone?.key === "first") {
      return {
        title:
          schedule?.mode === "thirds"
            ? "Pay the first installment to start the work"
            : "Pay the first half to start the work",
        sub:
          schedule?.mode === "thirds"
            ? "The artisan begins after the first 1/3 clears."
            : "The artisan begins after the first half clears.",
      };
    }
    if (milestone?.key === "second") {
      return {
        title: "Pay the second installment — the artisan is half-way through",
        sub: "Settling the middle third keeps the build moving.",
      };
    }
    return {
      title: "Your order is ready to ship",
      sub: "Confirm address and the final payment to finalize.",
    };
  })();
  const amountDue = milestone?.amount ?? 0;
  const dueLine = isFinal
    ? `${currency} ${amountDue.toFixed(2)} + shipping ≈ ${currency} ${(amountDue + ESTIMATED_SHIPPING_FALLBACK).toFixed(2)}`
    : `${currency} ${amountDue.toFixed(2)}`;

  return (
    <div className="card-enter mb-6 bg-white rounded-3xl shadow-md border-2 border-amber-300 overflow-hidden">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
          <CheckIcon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">{header.title}</p>
          <p className="text-xs text-amber-700/80">{header.sub}</p>
        </div>
      </div>

      {/* Milestone strip — three (or two) dots showing which installments
          have cleared and which is up next. */}
      <div className="px-5 sm:px-6 pt-4">
        <MilestoneStrip
          schedule={schedule}
          payments={activeOffer?.payments || []}
          currency={currency}
          activeKey={milestone?.key}
        />
      </div>

      <div className={`p-5 sm:p-6 grid grid-cols-1 gap-6 ${isFinal ? "md:grid-cols-2" : ""}`}>
        {/* Address (FINAL milestone only) + payment-method picker (ALL milestones).
            Earlier milestones don't need a shipping destination, but the buyer
            must still be able to choose how they pay. */}
        <div>
          {isFinal && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                <MapPinIcon size={14} />
                Address
              </p>
              {selectedAddress ? (
                <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-medium block mb-0.5">{selectedAddress.name}</span>
                    {selectedAddress.bostaDistrictName || selectedAddress.state},{" "}
                    {selectedAddress.bostaCityName || selectedAddress.city}
                    {selectedAddress.zip ? ` · ${selectedAddress.zip}` : ""}
                  </p>
                  <button
                    onClick={() => setSelectedAddress(null)}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                    aria-label="Change address"
                  >
                    <SquarePenIcon size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  {addressList.length > 0 && (
                    <select
                      className="border border-slate-300 p-2 w-full mb-2 outline-none rounded-lg text-sm"
                      onChange={(e) => {
                        const idx = e.target.value;
                        if (idx === "") setSelectedAddress(null);
                        else setSelectedAddress(addressList[Number(idx)]);
                      }}
                      defaultValue=""
                    >
                      <option value="">Select address</option>
                      {addressList.map((a, i) => (
                        <option key={i} value={i}>
                          {a.name} — {a.bostaDistrictName || a.state}, {a.bostaCityName || a.city}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => {
                      if (!session?.userId) {
                        toast.error("Sign in to save a delivery address.");
                        router.push("/register");
                        return;
                      }
                      setShowAddressModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900"
                  >
                    Add address <PlusIcon size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          <p className={`text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5 ${isFinal ? "mt-5" : ""}`}>
            <CreditCardIcon size={14} />
            Payment method
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
              <input type="radio" disabled className="accent-slate-500" />
              <span>Cash on Delivery (COD) (unavailable)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={paymentMethod === "STRIPE"}
                onChange={() => setPaymentMethod("STRIPE")}
                className="accent-[#e67e22]"
              />
              <span>Card (Stripe)</span>
            </label>
            {KASHIER_ENABLED && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={paymentMethod === "WALLET"}
                  onChange={() => setPaymentMethod("WALLET")}
                  className="accent-[#e67e22]"
                />
                <span>Mobile Wallet</span>
              </label>
            )}
          </div>
        </div>

        <div className={isFinal ? "md:border-l md:border-slate-100 md:pl-6" : ""}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Summary</p>
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Item</span>
              <span className="font-medium text-slate-800 truncate ml-3 max-w-[60%] text-right">
                {request.itemName || "Custom request"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Seller</span>
              <span className="text-slate-700">{activeOffer.sellerName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Order subtotal</span>
              <span>{currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Already paid</span>
              <span className="text-emerald-700">{currency} {paidSoFar.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                {milestone?.key === "first"
                  ? schedule?.mode === "thirds"
                    ? "First installment (1/3)"
                    : "First installment (1/2)"
                  : milestone?.key === "second"
                    ? "Second installment (1/3)"
                    : schedule?.mode === "thirds"
                      ? "Final installment (1/3)"
                      : "Final installment (1/2)"}
              </span>
              <span>{currency} {(milestone?.amount ?? 0).toFixed(2)}</span>
            </div>
            {isFinal && (
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{currency} {ESTIMATED_SHIPPING_FALLBACK.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between text-base font-semibold text-slate-900">
              <span>Due now</span>
              <span>
                {currency}{" "}
                {(
                  (milestone?.amount ?? 0) + (isFinal ? ESTIMATED_SHIPPING_FALLBACK : 0)
                ).toFixed(2)}
              </span>
            </div>
          </div>
          <button
            onClick={onPay}
            disabled={isFinal && !selectedAddress}
            className="cta-morph w-full mt-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-full py-3 text-base shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckIcon size={18} />
            {milestone?.key === "first"
              ? "Pay first installment"
              : milestone?.key === "second"
                ? "Pay second installment"
                : "Confirm & pay final"}
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-2">
            Sandbox demo --- no real charge is made. <span className="block">Hint: {dueLine}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Visual breakdown of the milestone schedule rendered above the address +
 * summary blocks. Each dot is one milestone — green when settled, amber
 * when due now, slate when still upcoming. Labels switch between "1/3"
 * and "1/2" automatically based on `schedule.mode`.
 */
function MilestoneStrip({ schedule, payments, currency, activeKey }) {
  if (!schedule || schedule.total <= 0) return null;
  const settled = new Set((payments || []).map((p) => p.milestone));
  const steps =
    schedule.mode === "thirds"
      ? [
          { key: "first", label: "1/3 · Start", amount: schedule.first },
          { key: "second", label: "1/3 · Halfway", amount: schedule.second },
          { key: "final", label: "1/3 · Delivery", amount: schedule.final },
        ]
      : [
          { key: "first", label: "1/2 · Start", amount: schedule.first },
          { key: "final", label: "1/2 · Delivery", amount: schedule.final },
        ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = settled.has(step.key);
        const due = step.key === activeKey && !done;
        const tone = done
          ? "bg-emerald-500 text-white border-emerald-500"
          : due
            ? "bg-amber-500 text-white border-amber-500 ring-4 ring-amber-200"
            : "bg-white text-slate-500 border-slate-300";
        return (
          <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold transition-colors ${tone}`}
              aria-label={`${step.label} ${done ? "paid" : due ? "due now" : "upcoming"}`}
            >
              {done ? <CheckIcon size={14} /> : i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-700 truncate">{step.label}</p>
              <p className="text-[10px] text-slate-500 truncate">
                {currency} {Number(step.amount || 0).toFixed(2)}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px flex-1 ${done ? "bg-emerald-300" : "bg-slate-200"}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChatCard({ request, mainImage, activeOffer, currency, messages, messageInput, setMessageInput, onSubmit, buyer, seller }) {
  return (
    <div className="card-enter lg:col-span-2 bg-white rounded-3xl shadow-sm flex flex-col h-[600px] lg:h-[750px] overflow-hidden order-2 lg:order-1">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-white z-10">
        <div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden shrink-0 relative border border-slate-100">
          <Image
            src={mainImage}
            alt=""
            width={40}
            height={40}
            className="object-cover w-full h-full"
            unoptimized={isDataUrl(mainImage)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{activeOffer.sellerName || "Seller"}</p>
          <p className="text-xs text-slate-500 truncate">
            Accepted · {currency}
            {activeOffer.price} · due{" "}
            {activeOffer.deliveryDate ? new Date(activeOffer.deliveryDate).toLocaleDateString() : "—"}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
            activeOffer.status === OFFER_STATUS.PAID
              ? "bg-emerald-100 text-emerald-700"
              : activeOffer.status === OFFER_STATUS.READY_TO_SHIP
                ? "bg-amber-100 text-amber-700"
                : activeOffer.status === OFFER_STATUS.PROGRESS_UPLOADED
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
          }`}
        >
          {activeOffer.status === OFFER_STATUS.PAID
            ? "Paid"
            : activeOffer.status === OFFER_STATUS.READY_TO_SHIP
              ? "Ready to ship"
              : activeOffer.status === OFFER_STATUS.PROGRESS_UPLOADED
                ? "Halfway · pay 2nd"
                : activeOffer.status === OFFER_STATUS.SECOND_PAID
                  ? "2nd paid · working"
                  : activeOffer.status === OFFER_STATUS.FIRST_PAID
                    ? "1st paid · working"
                    : "Accepted · pay 1st"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-[#fcfbf9]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.sender === "buyer" ? "self-end flex-row-reverse" : "self-start"}`}
          >
            <div className="mt-auto">
              {msg.sender === "buyer" ? (
                <Avatar name={buyer?.name} src={buyer?.image} size={32} />
              ) : (
                <Avatar name={seller?.name} src={seller?.image} size={32} />
              )}
            </div>
            <div
              className={`p-3 sm:p-4 rounded-2xl ${
                msg.sender === "buyer"
                  ? "bg-[#eedbc5] text-slate-800 rounded-br-none"
                  : "bg-white border border-slate-100 shadow-sm text-slate-700 rounded-bl-none"
              }`}
            >
              {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
              {msg.image && (
                <div className="w-48 h-48 rounded-lg overflow-hidden relative border border-slate-100 mt-2">
                  <Image
                    src={msg.image}
                    alt="Progress update image"
                    width={192}
                    height={192}
                    className="object-cover w-full h-full"
                    unoptimized={isDataUrl(msg.image)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 sm:p-5 bg-white border-t border-slate-100">
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 sm:gap-3 bg-[#faf8f5] p-2 rounded-full border border-slate-200 focus-within:border-[#e67e22] transition-colors"
        >
          <input
            suppressHydrationWarning
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent outline-none px-3 sm:px-4 text-sm text-slate-700 min-w-0"
          />
          <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hidden sm:inline-flex">
            <MicIcon size={20} />
          </button>
          <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hidden sm:inline-flex">
            <CameraIcon size={20} />
          </button>
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="w-10 h-10 rounded-full bg-[#d35400] text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-sm"
          >
            <SendIcon size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Replaces the chat once the final milestone is paid: a delivery-tracking card that
 * renders the custom order's Bosta shipment timeline (same TrackingTimeline standard
 * orders use). No chat input in this state. Includes the dev-only "simulate delivery"
 * demo affordance (mirrors the standard-order OrderItem button) so the order can be
 * walked to DELIVERED in development.
 */
function TrackingCard({ activeOffer, currency, simulating, onSimulate, seller }) {
  const shipment = activeOffer?.shipment || null;
  return (
    <div className="card-enter lg:col-span-2 bg-white rounded-3xl shadow-sm flex flex-col h-[600px] lg:h-[750px] overflow-hidden order-2 lg:order-1">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-white z-10">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <PackageCheckIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">Delivery tracking</p>
          <p className="text-xs text-slate-500 truncate">
            Paid · {currency}
            {activeOffer.price} · {seller?.name || "Seller"}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
          Order placed
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fcfbf9]">
        {shipment ? (
          <TrackingTimeline shipment={shipment} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2">
            <PackageCheckIcon size={32} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Preparing your shipment…</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Your payment cleared. The seller is arranging a Bosta pickup — tracking will
              appear here shortly.
            </p>
          </div>
        )}

        {/* DEV-ONLY demo control: one click walks the custom order to Delivered. */}
        {process.env.NODE_ENV !== "production" && activeOffer?.storeOrderId && (
          <button
            type="button"
            onClick={onSimulate}
            disabled={simulating}
            className="mt-4 text-xs text-[#2582eb] border border-[#2582eb]/30 rounded px-3 py-1 hover:bg-[#2582eb]/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {simulating ? "Simulating…" : "▶ Simulate delivery (demo)"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Replaces the tracking card once the shipment is DELIVERED: a review surface
 * (1–5 stars + comment) that posts to the SAME product-review endpoint standard
 * orders use, against the custom order's placeholder product. After a successful
 * submit it shows a "thanks, reviewed" state.
 */
function ReviewCard({ activeOffer, reviewed, onSubmit, seller }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast("Please pick a star rating.");
      return;
    }
    if (review.trim().length < 5) {
      toast("Please write a short review (at least 5 characters).");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ rating, review: review.trim() });
    } catch {
      toast.error("Could not submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-enter lg:col-span-2 bg-white rounded-3xl shadow-sm flex flex-col h-[600px] lg:h-[750px] overflow-hidden order-2 lg:order-1">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-white z-10">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <StarIcon size={20} className="fill-current" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">
            {reviewed ? "Thanks for your review" : "Delivered — leave a review"}
          </p>
          <p className="text-xs text-slate-500 truncate">{seller?.name || "Seller"}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
          Delivered
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#fcfbf9] flex flex-col items-center justify-center text-center">
        {reviewed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2Icon size={28} />
            </div>
            <p className="text-base font-semibold text-slate-800">Review submitted</p>
            <p className="text-sm text-slate-500 max-w-xs">
              Thank you for sharing your experience — it helps {seller?.name || "the seller"} and
              other buyers.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <p className="text-sm text-slate-600 mb-4">
              How was your custom piece from {seller?.name || "the seller"}?
            </p>
            <div className="flex items-center justify-center gap-1 mb-5">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
                >
                  <StarIcon
                    size={32}
                    className={`cursor-pointer transition-colors ${
                      rating > i ? "text-[#e67e22] fill-current" : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={5}
              value={review}
              onChange={(e) => setReview(e.target.value.slice(0, 1000))}
              placeholder="Tell other buyers about the quality, communication, and delivery…"
              className="w-full p-3 rounded-2xl border border-slate-300 bg-white text-sm leading-relaxed resize-none outline-none focus:border-[#e67e22] focus:ring-1 focus:ring-[#e67e22] transition-colors"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="cta-morph w-full mt-4 bg-[#e67e22] hover:bg-[#d35400] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-full py-3 text-base shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <StarIcon size={18} className="fill-current" />
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FullDetails({ request, images, activeImage, setActiveImage, colors, sizeKnown, isPackageSize }) {
  const mainImage = images[activeImage] || images[0] || "/placeholder.png";
  return (
    <div className="p-5 sm:p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="aspect-square rounded-2xl bg-[#faf8f5] overflow-hidden border border-slate-100">
          <Image
            src={mainImage}
            alt={request.itemName || ""}
            width={600}
            height={600}
            className="w-full h-full object-cover"
            unoptimized={isDataUrl(mainImage)}
          />
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {images.map((img, i) => {
              const active = i === activeImage;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={active}
                  className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    active ? "border-[#e67e22]" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized={isDataUrl(img)}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="lg:col-span-3">
        <DetailsBody
          request={request}
          colors={colors}
          sizeKnown={sizeKnown}
          isPackageSize={isPackageSize}
          countdown={null}
          activeOffer={null}
        />
      </div>
    </div>
  );
}

function CompactDetails({
  request,
  images,
  activeImage,
  setActiveImage,
  colors,
  sizeKnown,
  isPackageSize,
  countdown,
  activeOffer,
}) {
  const displayedImage = images[activeImage] || images[0] || "/placeholder.png";
  return (
    <div className="p-5 sm:p-6">
      {/* Compact image row: small hero + thumbnail strip side-by-side
          rather than a square hero that dominates the rail. */}
      <div className="flex gap-3 items-start">
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl bg-[#faf8f5] overflow-hidden border border-slate-100">
          <Image
            src={displayedImage}
            alt={request.itemName || ""}
            width={120}
            height={120}
            className="w-full h-full object-cover"
            unoptimized={isDataUrl(displayedImage)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                request.visibility === "private"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {request.visibility === "private" ? "Private" : "Open"}
            </span>
            {request.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {request.category}
              </span>
            )}
          </div>
          <h1 className="text-base font-bold text-[#1c355e] leading-tight line-clamp-2">
            {request.itemName || "Custom request"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UserIcon size={10} />
              {request.user?.name || "Buyer"}
            </span>
            {request.store?.name && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon size={10} />
                {request.store.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarIcon size={10} />
              {formatDate(request.createdAt)}
            </span>
            {request.updatedAt && request.updatedAt !== request.createdAt && (
              <span className="inline-flex items-center gap-1 text-slate-400 italic text-xs">
                · Edited {formatDate(request.updatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
          {images.map((img, i) => {
            const active = i === activeImage;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={active}
                className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                  active ? "border-[#e67e22]" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Image
                  src={img}
                  alt=""
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized={isDataUrl(img)}
                />
              </button>
            );
          })}
        </div>
      )}

      {activeOffer && countdown && (
        <div
          className={`card-enter mt-4 p-3 rounded-2xl flex items-center gap-3 ${
            countdown.tone === "danger"
              ? "bg-rose-50 text-rose-700"
              : countdown.tone === "warn"
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <ClockIcon size={18} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium opacity-80">Delivery deadline</p>
            <p className="text-sm font-semibold truncate">
              {countdown.label}
              {activeOffer.deliveryDate ? (
                <span className="font-normal opacity-70">
                  {" · "}
                  {new Date(activeOffer.deliveryDate).toLocaleDateString()}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      )}

      <div className="pt-4 mt-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 mb-1">Description</p>
        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-5">
          {request.description || "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-3 mt-3 border-t border-slate-100">
        <Field label="Quantity" value={request.quantity ?? 1} />
        <Field label="Material" value={request.material?.trim() ? request.material : "—"} />
        {sizeKnown ? (
          <Field
            label="Size (L×W×H)"
            value={[request.size.length, request.size.width, request.size.height]
              .map((n) => (n !== "" && n != null ? n : "—"))
              .join(" × ")}
          />
        ) : isPackageSize ? (
          <Field label="Shipping size" value={request.packageSize} />
        ) : null}
        <Field label="Delivery" value={formatDate(request.deliveryDate)} />
      </div>

      {colors.length > 0 && (
        <div className="pt-3 mt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mb-1.5">Colors</p>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c, i) => (
              <ColorChip key={i} color={c} />
            ))}
          </div>
        </div>
      )}

      {(request.voiceMemoDataUrl || request.voiceMemoUrl) && (
        <div className="pt-3 mt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mb-1.5">Voice memo</p>
          <audio
            controls
            src={request.voiceMemoDataUrl || request.voiceMemoUrl}
            className="w-full h-8"
          />
        </div>
      )}
    </div>
  );
}

function DetailsBody({ request, colors, sizeKnown, isPackageSize }) {
  return (
    <div className="flex flex-col gap-5 text-slate-700">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              request.visibility === "private"
                ? "bg-purple-100 text-purple-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {request.visibility === "private" ? "Private" : "Open"}
          </span>
          {request.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {request.category}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1c355e]">
          {request.itemName || "Custom request"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <UserIcon size={14} />
            {request.user?.name || "Buyer"}
          </span>
          {request.store?.name && (
            <span className="inline-flex items-center gap-1.5">
              <StoreIcon size={14} />
              For {request.store.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon size={14} />
            Posted {formatDate(request.createdAt)}
          </span>
          {request.updatedAt && request.updatedAt !== request.createdAt && (
            <span className="inline-flex items-center gap-1.5 text-slate-400 italic text-xs">
              · Edited {formatDate(request.updatedAt)}
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 mb-1.5">Description</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{request.description || "—"}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
        <Field label="Quantity" value={request.quantity ?? 1} />
        <Field label="Material" value={request.material?.trim() ? request.material : "—"} />
        {sizeKnown ? (
          <Field
            label="Size (L × W × H cm)"
            value={[request.size.length, request.size.width, request.size.height]
              .map((n) => (n !== "" && n != null ? n : "—"))
              .join(" × ")}
          />
        ) : isPackageSize ? (
          <Field label="Shipping size" value={request.packageSize} />
        ) : null}
        <Field label="Delivery" value={formatDate(request.deliveryDate)} />
      </div>
      {colors.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-2">Colors</p>
          <div className="flex flex-wrap gap-3">
            {colors.map((c, i) => (
              <ColorChip key={i} color={c} />
            ))}
          </div>
        </div>
      )}
      {(request.voiceMemoDataUrl || request.voiceMemoUrl) && (
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-2">Voice memo</p>
          <audio controls src={request.voiceMemoDataUrl || request.voiceMemoUrl} className="w-full h-10" />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-xs sm:text-sm font-medium text-slate-700">{value || "—"}</p>
    </div>
  );
}

function ColorChip({ color }) {
  const hex = (color.hex || "#e5e7eb").toUpperCase();
  const label = (color.description || color.name || "Color").trim() || "Color";
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(hex)}
      className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#faf8f5] border border-slate-200 hover:border-[#e67e22] active:scale-95 transition-all"
      title={`${hex} — tap to copy`}
    >
      <span
        className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
        style={{ backgroundColor: color.hex || "#e5e7eb" }}
      />
      <span className="text-[11px] text-slate-700">{label}</span>
      <span className="text-[10px] font-mono text-slate-400">{hex}</span>
    </button>
  );
}

function ProposalCard({
  proposal,
  currency,
  blockTaps,
  comment,
  onCommentChange,
  onAccept,
  onDecline,
  onBlock,
}) {
  const isPending = proposal.status === OFFER_STATUS.PENDING;
  const isDeclined = proposal.status === OFFER_STATUS.DECLINED;
  const isBlocked = proposal.status === OFFER_STATUS.BLOCKED;

  const blockArmed = blockTaps > 0;
  // After this click commits, how many taps are left? With 0 prior taps,
  // the first click sets blockTaps=1, so two more are needed → "Tap
  // twice more to confirm". With 1 prior tap, one more → "Tap once more".
  const tapsRemaining = 3 - blockTaps - 1;
  const sellerLabel = (proposal.sellerName || "this seller").trim();
  // Armed label always names the seller so the buyer can't mis-block on a
  // busy page with multiple proposals open: "Block Ahmed — tap twice more
  // to confirm".
  const armedLabel = `Block ${sellerLabel} — ${
    tapsRemaining === 0 ? "tap once more to confirm" : "tap twice more to confirm"
  }`;

  return (
    <div
      className={`card-enter bg-white rounded-3xl shadow-sm border p-5 sm:p-6 transition-opacity ${
        isBlocked
          ? "border-rose-100 opacity-70"
          : isDeclined
            ? "border-slate-100 opacity-75"
            : "border-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={proposal.sellerName || "Seller"} src={proposal.sellerLogo} size={40} className="shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{proposal.sellerName || "Seller"}</p>
            <p className="text-xs text-slate-500 truncate">Sent {formatDate(proposal.createdAt)}</p>
          </div>
        </div>

        {isPending && (
          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
            New
          </span>
        )}
        {isDeclined && (
          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-rose-100 text-rose-700">
            Declined
          </span>
        )}
        {isBlocked && (
          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-rose-100 text-rose-700">
            Blocked
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
        <div>
          <p className="text-xs text-slate-400 mb-1">Price</p>
          <p className="text-lg font-bold text-[#1c355e]">
            {currency} {Number(proposal.price || 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Delivery</p>
          <p className="text-sm font-medium text-slate-700">
            {proposal.deliveryDate
              ? new Date(proposal.deliveryDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>

      {/* Conversation history on the card — all back-and-forth comments
          stack here in chronological order. On accept, this same list
          seeds the chat surface so the seller and buyer pick up where
          they left off without losing context. */}
      {Array.isArray(proposal.comments) && proposal.comments.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Conversation</p>
          {proposal.comments.map((c) => (
            <div
              key={c.id}
              className={`p-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                c.author === "seller"
                  ? "bg-[#faf8f5] border border-slate-200 text-slate-700"
                  : "bg-blue-50 border border-blue-100 text-slate-800 self-end"
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-60 mb-1">
                {c.author === "seller" ? "Seller" : "You"}
              </p>
              {c.text}
            </div>
          ))}
        </div>
      )}

      {isPending && (
        <div className="mt-4">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Your reply <span className="text-slate-400 font-normal">(optional, sent with your decision)</span>
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => onCommentChange(e.target.value.slice(0, 240))}
            placeholder="Anything you want to tell the seller…"
            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs leading-relaxed resize-none outline-none focus:border-[#e67e22] focus:ring-1 focus:ring-[#e67e22] transition-colors"
          />
          <div className="flex justify-end mt-0.5">
            <span className="text-[10px] text-slate-400">{comment.length}/240</span>
          </div>
        </div>
      )}

      {/* Action row. Block button is normally icon-only (square pill,
          same height as Accept/Decline). On the FIRST tap it expands
          inline to a labelled pill that explains the gesture — "Tap
          twice more to confirm" — so a fat-finger tap never silently
          arms a destructive action. */}
      <div className="mt-4 flex items-stretch gap-2 sm:gap-3">
        {isPending && (
          <>
            <button
              onClick={onAccept}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-full py-2.5 px-4 transition-all active:scale-95 shadow-sm"
            >
              <CheckIcon size={16} />
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-full py-2.5 px-4 border border-slate-300 transition-all active:scale-95"
            >
              <XIcon size={16} />
              Decline
            </button>
          </>
        )}

        {!isBlocked && (
          <button
            onClick={onBlock}
            aria-label={blockArmed ? armedLabel : `Block ${sellerLabel}`}
            className={`cta-morph relative inline-flex items-center justify-center gap-1.5 rounded-full active:scale-95 font-medium transition-all duration-200 ${
              blockArmed
                ? "bg-rose-600 text-white shadow-lg ring-4 ring-rose-200 px-4 py-2.5 text-xs"
                : "bg-white text-slate-500 border border-slate-300 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 w-11 h-11 shrink-0 self-center"
            }`}
            title={blockArmed ? armedLabel : `Block ${sellerLabel}`}
          >
            <ShieldOffIcon size={16} className="shrink-0" />
            {blockArmed && (
              <span className="whitespace-nowrap">{armedLabel}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
