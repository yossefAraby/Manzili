"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  SendIcon,
  MicIcon,
  CameraIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ArrowUpRightIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  LoaderIcon,
  RotateCcwIcon,
  PackageCheckIcon,
  UserIcon,
  StoreIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import { mapStoredRequestToCollaborationOrder } from "@/lib/customRequestsLocal";
import {
  OFFER_STATUS,
  getCustomRequestById,
  getLatestOfferForSeller,
  addOfferToRequest,
  appendOfferChatMessage,
  markOfferReadyToShip,
} from "@/lib/services/localCustomRequestService";
import {
  notifyProposalSent,
  notifyReadyToShip,
} from "@/lib/services/customOrderNotifications";

/**
 * Seller-facing negotiation surface — status-driven (see localCustomRequestService).
 */

function isDataUrl(src) {
  return typeof src === "string" && src.startsWith("data:");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
    return {
      label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`,
      tone: "danger",
    };
  return {
    label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
    tone: diffDays <= 3 ? "warn" : "ok",
  };
}

function hasDimensions(size) {
  if (!size) return false;
  return Boolean(size.length || size.width || size.height);
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

/** Map a persisted comment history (seller/buyer) into chat-shaped messages.
 *  Seller is the local user → "artisan" lane on the right. */
function commentsToMessages(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.map((c) => ({
    id: c.id,
    sender: c.author === "seller" ? "artisan" : "buyer",
    type: "text",
    text: c.text,
    time: new Date(c.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}

export default function NegotiationPage() {
  const params = useParams();
  const orderId = params.id;
  const router = useRouter();
  const dispatch = useDispatch();
  const currency = "EGP";

  const session = useSelector((s) => s.auth.session);
  const sellerId = session?.userId || null;
  const sellerName = session?.name || "Seller";

  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [request, setRequest] = useState(null); // raw, for ownerUserId
  const [offer, setOffer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeImage, setActiveImage] = useState(0);

  const [proposedPrice, setProposedPrice] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [acceptBuyerDate, setAcceptBuyerDate] = useState(true);
  const [sellerComment, setSellerComment] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState("");

  // Triple-tap "Order ready to ship". 0 → 1 → 2 → commit. Auto-resets
  // after 4s of inactivity.
  const [readyToShipTaps, setReadyToShipTaps] = useState(0);
  const tapTimer = useRef(null);

  // ---- load -----------------------------------------------------------------
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const raw = await getCustomRequestById(orderId);
        if (cancelled) return;
        const mapped = mapStoredRequestToCollaborationOrder(raw);
        if (!mapped) {
          setOrderDetails(null);
          return;
        }
        setRequest(raw);
        setOrderDetails(mapped);
        setProposedDate(mapped.buyerDeadline || "");

        let existing = null;
        if (sellerId) {
          existing = await getLatestOfferForSeller(orderId, sellerId);
          if (existing) {
            setOffer(existing);
            setProposedPrice(String(existing.price ?? ""));
            setProposedDate(existing.deliveryDate || mapped.buyerDeadline || "");
            // Don't pre-fill the textarea with the last note — the
            // seller is about to write a new one. Leave it empty.
            setAcceptBuyerDate(false);
          }
        }

        // Seed chat messages from the comment history of the active
        // deal. If there is no offer yet, show only the buyer's
        // intro (the original request description).
        if (existing && Array.isArray(existing.comments) && existing.comments.length > 0) {
          setMessages([
            {
              id: "intro",
              sender: "buyer",
              type: "text",
              text: mapped.description || "No description provided.",
              time: "",
            },
            ...commentsToMessages(existing.comments),
          ]);
        } else {
          setMessages([
            {
              id: "intro",
              sender: "buyer",
              type: "text",
              text: mapped.description || "No description provided.",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch {
        toast.error("Failed to load negotiation data.");
        setOrderDetails(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, sellerId]);

  useEffect(() => {
    if (readyToShipTaps === 0) return;
    tapTimer.current = setTimeout(() => setReadyToShipTaps(0), 4000);
    return () => clearTimeout(tapTimer.current);
  }, [readyToShipTaps]);

  // ---- derived --------------------------------------------------------------
  const status = offer?.status ?? null;
  const isPending = status === OFFER_STATUS.PENDING;
  const isDeclined = status === OFFER_STATUS.DECLINED;
  const isBlocked = status === OFFER_STATUS.BLOCKED;
  const isAccepted = status === OFFER_STATUS.ACCEPTED;
  const isReadyToShip = status === OFFER_STATUS.READY_TO_SHIP;
  const isPaid = status === OFFER_STATUS.PAID;
  const isSuperseded = status === OFFER_STATUS.SUPERSEDED;

  const chatUnlocked = isAccepted || isReadyToShip || isPaid;
  const inputsLocked = isPending || isAccepted || isReadyToShip || isPaid || isBlocked || isSuperseded;

  const countdown = useMemo(
    () => (chatUnlocked ? formatCountdown(offer?.deliveryDate) : null),
    [chatUnlocked, offer?.deliveryDate],
  );

  const images = useMemo(() => {
    if (!orderDetails) return [];
    return orderDetails.images?.length ? orderDetails.images : [orderDetails.mainImage];
  }, [orderDetails]);
  const displayedImage = images[activeImage] || images[0];

  // ---- handlers -------------------------------------------------------------
  const handleSendProposal = async () => {
    if (!sellerId) {
      toast.error("Please sign in to send a proposal.");
      return;
    }
    if (!proposedPrice || Number(proposedPrice) <= 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    const finalDate = acceptBuyerDate
      ? orderDetails.buyerDeadline || proposedDate
      : proposedDate;
    if (!finalDate) {
      toast.error("Please select a delivery date.");
      return;
    }
    try {
      setIsSending(true);
      const isResend = Boolean(offer);
      const saved = await addOfferToRequest(orderId, {
        sellerId,
        sellerName,
        price: Number(proposedPrice),
        deliveryDate: finalDate,
        sellerComment: sellerComment.trim() || null,
      });
      setOffer(saved);
      setSellerComment("");

      // Notify buyer
      if (request?.ownerUserId) {
        notifyProposalSent({
          buyerUserId: request.ownerUserId,
          sellerName,
          requestId: orderId,
          itemName: orderDetails.itemName,
          isResend,
          dispatch,
          currentUserId: sellerId,
        });
      }
      toast.success(isResend ? "Proposal resent." : "Proposal sent.");
    } catch {
      toast.error("Failed to send proposal.");
    } finally {
      setIsSending(false);
    }
  };

  const handleReadyToShip = async () => {
    if (readyToShipTaps < 2) {
      setReadyToShipTaps((n) => n + 1);
      return;
    }
    if (!offer?.id) return;
    try {
      setIsSending(true);
      const updated = await markOfferReadyToShip(offer.id);
      setOffer(updated);
      setReadyToShipTaps(0);
      if (request?.ownerUserId) {
        notifyReadyToShip({
          buyerUserId: request.ownerUserId,
          sellerName,
          requestId: orderId,
          itemName: orderDetails.itemName,
          dispatch,
          currentUserId: sellerId,
        });
      }
      toast.success("Marked as ready to ship.");
    } catch {
      toast.error("Could not update the order.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !chatUnlocked || !offer?.id) return;
    const text = messageInput;
    setMessageInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "artisan",
        type: "text",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    try {
      const updated = await appendOfferChatMessage(offer.id, { author: "seller", text });
      if (updated) setOffer(updated);
    } catch {
      /* non-fatal — message is already on screen */
    }
  };

  // ---- render ---------------------------------------------------------------
  if (loading) return <Loading />;
  if (!orderDetails)
    return (
      <div className="text-center mt-20 px-4">
        <p className="text-slate-600 font-medium">Request not found.</p>
        <button
          type="button"
          onClick={() => router.push("/custom")}
          className="mt-6 text-[#2582eb] font-medium hover:underline"
        >
          Go to Custom Requests
        </button>
      </div>
    );

  const sizeKnown = hasDimensions(orderDetails.size);
  const isPackageSize = orderDetails.sizeMode === "package" && orderDetails.packageSize;

  return (
    <div className="min-h-screen bg-[#f4efe4] py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ChevronLeftIcon size={20} />
          <span className="font-medium">Back to Requests</span>
        </button>

        <div
          className={`grid grid-cols-1 gap-6 transition-all duration-500 ${
            chatUnlocked ? "lg:grid-cols-3" : "lg:grid-cols-1 lg:max-w-3xl lg:mx-auto"
          }`}
        >
          {chatUnlocked && (
            <ChatCard
              orderDetails={orderDetails}
              offer={offer}
              messages={messages}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              onSubmit={handleSendMessage}
              currency={currency}
            />
          )}

          <div className={`flex flex-col gap-6 ${chatUnlocked ? "h-auto lg:h-[750px] pb-2 order-1 lg:order-2" : ""}`}>
            {/* COMPACT DETAILS — small hero, all thumbs inline */}
            <div
              className={`card-scrollbar bg-white rounded-3xl shadow-sm border border-slate-50 ${
                chatUnlocked ? "flex-1 min-h-0 overflow-y-auto" : ""
              }`}
            >
              <CompactDetails
                orderDetails={orderDetails}
                orderId={orderId}
                images={images}
                activeImage={activeImage}
                setActiveImage={setActiveImage}
                displayedImage={displayedImage}
                sizeKnown={sizeKnown}
                isPackageSize={isPackageSize}
              />
            </div>

            {/* PROPOSAL CARD (last in source order → bottom on mobile) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-50">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-[#1c355e]">Your Proposal</h3>
                {status && <ProposalStatusBadge status={status} />}
              </div>

              {chatUnlocked && countdown && (
                <Countdown countdown={countdown} deliveryDate={offer?.deliveryDate} />
              )}

              {isBlocked && (
                <div className="card-enter mb-4 p-3 rounded-2xl bg-rose-50 text-rose-700 text-sm">
                  The buyer has blocked further proposals for this request.
                </div>
              )}
              {isSuperseded && (
                <div className="card-enter mb-4 p-3 rounded-2xl bg-slate-50 text-slate-600 text-sm">
                  The buyer accepted a different proposal.
                </div>
              )}

              {/* Conversation history — mirrors the buyer side. While the
                  proposal is still pending/declined/blocked the back-and-
                  forth lives here on the card. Once the buyer accepts and
                  the chat unlocks, this same history is replayed inside
                  the chat surface, so we hide it from the card to avoid
                  showing the same messages twice. */}
              {!chatUnlocked &&
                Array.isArray(offer?.comments) &&
                offer.comments.length > 0 && (
                  <div className="card-enter mb-4 flex flex-col gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Conversation
                    </p>
                    {offer.comments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          c.author === "seller"
                            ? "bg-[#faf8f5] border border-slate-200 text-slate-700 self-end"
                            : "bg-blue-50 border border-blue-100 text-slate-800"
                        }`}
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wide opacity-60 mb-1">
                          {c.author === "seller" ? "You" : "Buyer"}
                        </p>
                        {c.text}
                      </div>
                    ))}
                  </div>
                )}

              <div className="flex flex-col gap-3">
                <label className={`flex items-center justify-between gap-3 text-xs ${inputsLocked ? "opacity-50" : ""}`}>
                  <span className="text-slate-600 min-w-0 truncate">
                    Accept buyer&apos;s date ({orderDetails.buyerDeadline || "not set"})
                  </span>
                  <div className="relative inline-flex items-center shrink-0">
                    <input
                      suppressHydrationWarning
                      type="checkbox"
                      className="sr-only peer"
                      checked={acceptBuyerDate}
                      disabled={inputsLocked}
                      onChange={() => setAcceptBuyerDate(!acceptBuyerDate)}
                    />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-[#e67e22] transition-colors duration-200"></div>
                    <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5"></span>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Delivery</label>
                    <div
                      className={`flex items-center border rounded-xl px-2 transition-colors ${
                        (acceptBuyerDate && orderDetails.buyerDeadline) || inputsLocked
                          ? "bg-slate-50 border-slate-200 opacity-60"
                          : "bg-white border-slate-300 focus-within:border-[#e67e22] focus-within:ring-1 focus-within:ring-[#e67e22]"
                      }`}
                    >
                      <CalendarIcon size={14} className="text-slate-400 shrink-0" />
                      <input
                        suppressHydrationWarning
                        type="date"
                        value={acceptBuyerDate ? orderDetails.buyerDeadline || proposedDate : proposedDate}
                        onChange={(e) => setProposedDate(e.target.value)}
                        disabled={inputsLocked || (acceptBuyerDate && Boolean(orderDetails.buyerDeadline))}
                        className="w-full p-2 outline-none bg-transparent text-xs text-slate-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Price ({currency})</label>
                    <div
                      className={`flex items-center border rounded-xl px-3 transition-colors ${
                        inputsLocked
                          ? "bg-slate-50 border-slate-200 opacity-60"
                          : "border-slate-300 bg-white focus-within:border-[#e67e22] focus-within:ring-1 focus-within:ring-[#e67e22]"
                      }`}
                    >
                      <input
                        suppressHydrationWarning
                        type="number"
                        min="1"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        placeholder="0.00"
                        disabled={inputsLocked}
                        className="w-full p-2 outline-none bg-transparent text-sm text-slate-800 font-medium disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Note to buyer{" "}
                    <span className="text-slate-400 font-normal">
                      (similar color, different material, etc.)
                    </span>
                  </label>
                  <textarea
                    suppressHydrationWarning
                    rows={2}
                    value={sellerComment}
                    onChange={(e) => setSellerComment(e.target.value.slice(0, 240))}
                    disabled={inputsLocked}
                    placeholder="Optional — anything the buyer should know"
                    className={`w-full p-2.5 rounded-xl border text-xs leading-relaxed resize-none outline-none transition-colors ${
                      inputsLocked
                        ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        : "bg-white border-slate-300 focus:border-[#e67e22] focus:ring-1 focus:ring-[#e67e22]"
                    }`}
                  />
                  <div className="flex justify-end mt-0.5">
                    <span className="text-[10px] text-slate-400">{sellerComment.length}/240</span>
                  </div>
                </div>

                <CtaButton
                  status={status}
                  isSending={isSending}
                  readyToShipTaps={readyToShipTaps}
                  onSend={handleSendProposal}
                  onReadyToShip={handleReadyToShip}
                />

                <p className="text-[10px] text-center text-slate-400 -mt-1">
                  {isAccepted
                    ? "Tap 3× to confirm ready to ship."
                    : isReadyToShip
                      ? "Waiting for buyer payment."
                      : isPaid
                        ? "Buyer paid — ship to the saved address."
                        : "By negotiating, you commit to this price and deadline."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- sub-components --------------------------------------------------------

function ChatCard({ orderDetails, offer, messages, messageInput, setMessageInput, onSubmit, currency }) {
  return (
    <div className="card-enter lg:col-span-2 bg-white rounded-3xl shadow-sm flex flex-col h-[600px] lg:h-[750px] overflow-hidden order-2 lg:order-1">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-white z-10">
        <div className="w-10 h-10 bg-slate-200 rounded-xl overflow-hidden shrink-0 relative border border-slate-100">
          <Image
            src={orderDetails.mainImage}
            alt=""
            width={40}
            height={40}
            className="object-cover w-full h-full"
            unoptimized={isDataUrl(orderDetails.mainImage)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{orderDetails.itemName}</p>
          <p className="text-xs text-slate-500 truncate">
            {orderDetails.category ? `${orderDetails.category} · ` : ""}
            {orderDetails.buyerName}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
            offer.status === OFFER_STATUS.PAID
              ? "bg-emerald-100 text-emerald-700"
              : offer.status === OFFER_STATUS.READY_TO_SHIP
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
          }`}
        >
          <CheckCircle2Icon size={12} />
          {offer.status === OFFER_STATUS.PAID
            ? "Paid"
            : offer.status === OFFER_STATUS.READY_TO_SHIP
              ? "Ready to ship"
              : "Accepted"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-[#fcfbf9]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.sender === "artisan" ? "self-end flex-row-reverse" : "self-start"
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto">
              <Image
                src={
                  msg.sender === "artisan"
                    ? "https://i.pravatar.cc/150?u=ahmed"
                    : "https://i.pravatar.cc/150?u=amira"
                }
                alt={msg.sender}
                width={32}
                height={32}
              />
            </div>
            <div
              className={`p-3 sm:p-4 rounded-2xl ${
                msg.sender === "artisan"
                  ? "bg-[#eedbc5] text-slate-800 rounded-br-none"
                  : "bg-white border border-slate-100 shadow-sm text-slate-700 rounded-bl-none"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
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

function CompactDetails({
  orderDetails,
  orderId,
  images,
  activeImage,
  setActiveImage,
  displayedImage,
  sizeKnown,
  isPackageSize,
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Request details
        </p>
        <Link
          href={`/custom/request-view/${orderId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#2582eb] hover:text-[#1c355e] transition-colors"
        >
          Open full view
          <ArrowUpRightIcon size={14} />
        </Link>
      </div>

      {/* Compact image row: small hero (110×110) + thumbnail strip
          inline. The card no longer "eats" itself with a square hero. */}
      <div className="flex gap-3 items-start">
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl bg-[#faf8f5] overflow-hidden border border-slate-100">
          <Image
            src={displayedImage}
            alt={orderDetails.itemName}
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
                orderDetails.visibility === "private"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {orderDetails.visibility === "private" ? "Private" : "Open"}
            </span>
            {orderDetails.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {orderDetails.category}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-[#1c355e] leading-tight line-clamp-2">
            {orderDetails.itemName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UserIcon size={10} />
              {orderDetails.buyerName}
            </span>
            {orderDetails.store?.name && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon size={10} />
                {orderDetails.store.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarIcon size={10} />
              {formatDate(orderDetails.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* All thumbnails inline — switching the small hero on tap. Hidden
          when there's only one image so we don't show a single empty-
          looking row. */}
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

      <div className="pt-4 mt-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 mb-1">Description</p>
        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-5">
          {orderDetails.description || "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-3 mt-3 border-t border-slate-100 text-xs">
        <Field label="Quantity" value={orderDetails.quantity} />
        <Field label="Material" value={orderDetails.material} />
        {sizeKnown ? (
          <Field
            label="Size (L×W×H)"
            value={[orderDetails.size.length, orderDetails.size.width, orderDetails.size.height]
              .map((n) => (n !== "" && n != null ? n : "—"))
              .join(" × ")}
          />
        ) : isPackageSize ? (
          <Field label="Shipping size" value={orderDetails.packageSize} />
        ) : null}
        <Field label="Delivery" value={formatDate(orderDetails.buyerDeadline)} />
      </div>

      {orderDetails.colors?.length > 0 && (
        <div className="pt-3 mt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mb-1.5">Colors</p>
          <div className="flex flex-wrap gap-1.5">
            {orderDetails.colors.map((c, i) => (
              <ColorChip key={i} color={c} />
            ))}
          </div>
        </div>
      )}

      {orderDetails.voiceNoteUrl && (
        <div className="pt-3 mt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mb-1.5">Voice memo</p>
          <audio controls src={orderDetails.voiceNoteUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-xs font-medium text-slate-700">{value || "—"}</p>
    </div>
  );
}

function Countdown({ countdown, deliveryDate }) {
  return (
    <div
      className={`card-enter mb-4 p-3 rounded-2xl flex items-center gap-3 ${
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
          {deliveryDate ? (
            <span className="font-normal opacity-70">
              {" · "}
              {new Date(deliveryDate).toLocaleDateString()}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function ColorChip({ color }) {
  const hex = (color.hex || "#e5e7eb").toUpperCase();
  const label = (color.name || color.description || "Color").trim() || "Color";
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(hex)}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#faf8f5] border border-slate-200 hover:border-[#e67e22] active:scale-95 transition-all"
      title={`${hex} — tap to copy`}
    >
      <span
        className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
        style={{ backgroundColor: color.hex || "#e5e7eb" }}
      />
      <span className="text-[10px] text-slate-700">{label}</span>
      <span className="text-[9px] font-mono text-slate-400">{hex}</span>
    </button>
  );
}

function ProposalStatusBadge({ status }) {
  const meta = (() => {
    switch (status) {
      case OFFER_STATUS.PENDING:
        return { label: "Awaiting buyer", className: "bg-blue-100 text-blue-700" };
      case OFFER_STATUS.DECLINED:
        return { label: "Declined", className: "bg-rose-100 text-rose-700" };
      case OFFER_STATUS.BLOCKED:
        return { label: "Blocked", className: "bg-rose-100 text-rose-700" };
      case OFFER_STATUS.ACCEPTED:
        return { label: "Accepted", className: "bg-emerald-100 text-emerald-700" };
      case OFFER_STATUS.READY_TO_SHIP:
        return { label: "Ready to ship", className: "bg-amber-100 text-amber-700" };
      case OFFER_STATUS.PAID:
        return { label: "Paid", className: "bg-emerald-100 text-emerald-700" };
      case OFFER_STATUS.SUPERSEDED:
        return { label: "Closed", className: "bg-slate-100 text-slate-600" };
      default:
        return null;
    }
  })();
  if (!meta) return null;
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function CtaButton({ status, isSending, readyToShipTaps, onSend, onReadyToShip }) {
  const config = (() => {
    if (status === OFFER_STATUS.PENDING) {
      return {
        label: "Pending response",
        onClick: null,
        className: "bg-slate-400 text-white cursor-default",
        icon: <LoaderIcon size={18} className="animate-spin" />,
        disabled: true,
      };
    }
    if (status === OFFER_STATUS.DECLINED) {
      return {
        label: isSending ? "Sending..." : "Resend proposal",
        onClick: onSend,
        className: "bg-[#1c355e] hover:bg-[#2582eb] text-white shadow-md",
        icon: <RotateCcwIcon size={18} />,
        disabled: isSending,
      };
    }
    if (status === OFFER_STATUS.BLOCKED) {
      return {
        label: "Blocked by buyer",
        onClick: null,
        className: "bg-rose-200 text-rose-700 cursor-not-allowed",
        icon: <XCircleIcon size={18} />,
        disabled: true,
      };
    }
    if (status === OFFER_STATUS.ACCEPTED) {
      const tapsRemaining = 3 - readyToShipTaps - 1; // taps after current click
      const armed = readyToShipTaps > 0;
      const label = isSending
        ? "Updating..."
        : armed
          ? tapsRemaining === 0
            ? "Tap once more to confirm"
            : "Tap twice more to confirm"
          : "Order ready to ship";
      return {
        label,
        onClick: onReadyToShip,
        className: armed
          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg ring-4 ring-amber-200"
          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md",
        icon: <PackageCheckIcon size={18} />,
        disabled: isSending,
      };
    }
    if (status === OFFER_STATUS.READY_TO_SHIP) {
      return {
        label: "Waiting for buyer payment",
        onClick: null,
        className: "bg-amber-100 text-amber-700 cursor-default",
        icon: <ClockIcon size={18} className="pulse-dot" />,
        disabled: true,
      };
    }
    if (status === OFFER_STATUS.PAID) {
      return {
        label: "Paid · ready to ship",
        onClick: null,
        className: "bg-emerald-100 text-emerald-700 cursor-default",
        icon: <CheckCircle2Icon size={18} />,
        disabled: true,
      };
    }
    if (status === OFFER_STATUS.SUPERSEDED) {
      return {
        label: "Buyer chose another proposal",
        onClick: null,
        className: "bg-slate-200 text-slate-600 cursor-not-allowed",
        icon: <XCircleIcon size={18} />,
        disabled: true,
      };
    }
    return {
      label: isSending ? "Sending..." : "Send Proposal",
      onClick: onSend,
      className: "bg-[#b64b2b] hover:bg-[#9c4024] text-white shadow-md",
      icon: <SendIcon size={18} />,
      disabled: isSending,
    };
  })();

  return (
    <button
      type="button"
      onClick={config.onClick || undefined}
      disabled={config.disabled && !config.onClick}
      className={`cta-morph w-full mt-1 font-medium rounded-full py-3 text-base active:scale-95 flex items-center justify-center gap-2 ${config.className}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {status === OFFER_STATUS.PENDING && (
        <span className="ml-1 inline-flex items-center gap-1" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-white pulse-dot" />
          <span
            className="w-1.5 h-1.5 rounded-full bg-white pulse-dot"
            style={{ animationDelay: "0.2s" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-white pulse-dot"
            style={{ animationDelay: "0.4s" }}
          />
        </span>
      )}
    </button>
  );
}
