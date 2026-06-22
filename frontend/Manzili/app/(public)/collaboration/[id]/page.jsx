"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  SendIcon,
  MicIcon,
  CameraIcon,
  PlayIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ArrowUpRightIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import Avatar from "@/components/Avatar";
import ReportButton from "@/components/ReportButton";
import {
  fetchRequestById as apiFetchRequestById,
  fetchOffers as apiFetchOffers,
  createOffer,
  sendOfferMessage,
  fetchOfferMessages,
} from "@/lib/api/custom";

function isDataUrl(src) {
  return typeof src === "string" && src.startsWith("data:");
}

/**
 * Map an API request-detail DTO (adaptRequestDetail shape) into the order shape
 * this collaboration UI consumes. Kept local now that the shared local mapper
 * is gone.
 */
function toCollaborationOrder(raw) {
  if (!raw) return null;
  const colorRows = Array.isArray(raw.colors)
    ? raw.colors
        .filter((c) => c && (c.hex || c.description || c.name))
        .map((c) => ({
          hex: c.hex || "#e5e7eb",
          name: (c.description || c.name || "").trim() || "Color",
        }))
    : [];
  const mainImage =
    Array.isArray(raw.images) && raw.images.length > 0 ? raw.images[0] : "/placeholder.png";
  return {
    id: raw.id,
    itemName: raw.itemName || "Custom request",
    description: raw.description || "",
    category: raw.category || "",
    buyerName: raw.user?.name || "Buyer",
    material: raw.material?.trim() ? raw.material : "—",
    quantity: raw.quantity ?? 1,
    buyerDeadline: raw.deliveryDate || "",
    colors: colorRows.length > 0 ? colorRows : [{ hex: "#e5e7eb", name: "Not specified" }],
    mainImage,
    images: Array.isArray(raw.images) ? raw.images : [],
    voiceNoteUrl: raw.voiceMemoUrl || raw.voiceMemoDataUrl || null,
    visibility: raw.visibility,
    store: raw.store || null,
    size: raw.size || null,
    sizeMode: raw.sizeMode || null,
    packageSize: raw.packageSize || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    user: raw.user || null,
  };
}

/** Map persisted offer MESSAGES (the real chat) into chat-shaped messages.
 *  Seller is the local user → "artisan" lane on the right. Images preserved. */
function apiMessagesToLanes(apiMsgs) {
  return (apiMsgs || []).map((m) => ({
    id: m.id,
    sender: m.author === "seller" ? "artisan" : "buyer",
    type: "text",
    text: m.text,
    image: m.image || null,
    time: m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "",
  }));
}

export default function CollaborationSpace() {
  const params = useParams();
  const orderId = params.id; // جلب الـ ID من الرابط
  const router = useRouter();
  const currency = "EGP";

  const session = useSelector((s) => s.auth.session);
  // Offers carry the seller's STORE id (Sellerid), not the person's userId — use
  // storeId so this seller's existing offer is matched on reload (mirrors the
  // negotiation surface).
  const sellerId = session?.storeId || null;

  // ==========================================
  // 1. STATES
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  // The offer this seller has on the request, if any — set once a proposal is
  // sent so chat messages can be persisted against it.
  const [offer, setOffer] = useState(null);

  // Form States
  const [messageInput, setMessageInput] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [acceptBuyerDate, setAcceptBuyerDate] = useState(true);

  // ==========================================
  // 2. DATA FETCHING (Backend Entry Point)
  // ==========================================
  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const raw = await apiFetchRequestById(orderId);

        if (cancelled) return;

        const mapped = toCollaborationOrder(raw);
        if (!mapped) {
          setOrderDetails(null);
          setMessages([]);
          return;
        }

        setOrderDetails(mapped);
        setProposedDate(mapped.buyerDeadline || "");

        const intro = {
          id: "intro",
          sender: "buyer",
          type: "text",
          text: mapped.description || "No description provided.",
          time: "",
        };

        // Derive this seller's existing offer on load (newest-first, filtered to
        // the seller) so offer.id is available for the real chat fetch/poll —
        // mirroring the negotiation surface. Without this, reloading the page
        // would lose the offer channel entirely.
        let existing = null;
        if (sellerId) {
          const offers = [...((await apiFetchOffers(orderId)) || [])].sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
          );
          existing = offers.find((o) => o.sellerId === sellerId) || null;
        }
        if (cancelled) return;
        if (existing) setOffer(existing);

        // Seed chat from the REAL persisted offer messages (offer_messages
        // table, via fetchOfferMessages) — NOT the description / offer summaries
        // it used to stuff in here. If there's no offer yet, show only the
        // buyer's intro.
        if (existing?.id) {
          const apiMsgs = await fetchOfferMessages(existing.id);
          if (cancelled) return;
          setMessages([intro, ...apiMessagesToLanes(apiMsgs)]);
        } else {
          setMessages([intro]);
        }
      } catch {
        toast.error("Failed to load negotiation data.");
        setOrderDetails(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, sellerId]);

  // Re-fetch the real persisted chat (offer_messages) and re-set the whole list
  // from the server (plus intro) so optimistic temp rows are replaced by the
  // persisted ones and the buyer's messages show up. Used by polling + after send.
  const loadMessages = useCallback(async () => {
    if (!offer?.id) return;
    const intro = {
      id: "intro",
      sender: "buyer",
      type: "text",
      text: orderDetails?.description || "No description provided.",
      time: "",
    };
    const apiMsgs = await fetchOfferMessages(offer.id);
    setMessages([intro, ...apiMessagesToLanes(apiMsgs)]);
  }, [offer?.id, orderDetails?.description]);

  // Light polling (~5s) once an offer channel exists so the seller sees the
  // buyer's messages without a manual refresh. Paused when the tab is hidden.
  useEffect(() => {
    if (!offer?.id) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [offer?.id, loadMessages]);

  // ==========================================
  // 3. ACTION HANDLERS (Backend Entry Points)
  // ==========================================

  // إرسال رسالة في الشات
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const text = messageInput;
    try {
      setIsSending(true);

      // Optimistic UI update — message shows immediately.
      const newMessage = {
        id: Date.now(),
        sender: "artisan", // Or 'buyer' based on logged in user
        text,
        type: "text",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput("");

      // Persist against the seller's offer when one exists (POST
      // /custom/offers/{id}/messages). Until a proposal is sent there is no
      // offer channel, so the message stays optimistic only.
      if (offer?.id) {
        await sendOfferMessage(offer.id, { text });
        // Refetch so the optimistic temp row is replaced by the persisted one.
        await loadMessages();
      }
    } catch (error) {
      toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  // إرسال طلب التفاوض
  const handleNegotiate = async () => {
    if (!proposedPrice || Number(proposedPrice) <= 0) {
      return toast.error("Please enter a valid price.");
    }

    const finalDate = acceptBuyerDate
      ? orderDetails.buyerDeadline || proposedDate
      : proposedDate;
    if (!finalDate) {
      return toast.error("Please select a delivery date.");
    }

    try {
      setIsSending(true);

      const saved = await createOffer(orderId, {
        price: Number(proposedPrice),
        deliveryDate: finalDate,
      });
      setOffer(saved);
      toast.success(
        `Proposal sent! Price: ${currency}${proposedPrice}, Date: ${finalDate}`,
      );
    } catch (error) {
      toast.error("Failed to send negotiation proposal.");
    } finally {
      setIsSending(false);
    }
  };

  // ==========================================
  // 4. RENDER
  // ==========================================
  if (loading) return <Loading />;
  if (!orderDetails)
    return (
      <div className="text-center mt-20 px-4">
        <p className="text-slate-600 font-medium">Request not found.</p>
        <p className="text-slate-500 text-sm mt-2">
          Create a request from Custom Order or open it from Custom Requests.
        </p>
        <button
          type="button"
          onClick={() => router.push("/custom")}
          className="mt-6 text-[#2582eb] font-medium hover:underline"
        >
          Go to Custom Requests
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f4efe4] py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header / Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ChevronLeftIcon size={20} />
          <span className="font-medium">Back to Requests</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========================================== */}
          {/* CHAT CARD (Left Column) */}
          {/* ========================================== */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm flex flex-col h-[750px] overflow-hidden">
            {/* Admin oversight notice */}
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-500 mb-3">
              <span className="shrink-0 mt-0.5">🔒</span>
              <span>
                Conversations in this space may be reviewed by Manzili
                administrators for quality assurance and dispute resolution.
              </span>
            </div>
            {/* Chat Header */}
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
                <p className="font-semibold text-slate-800 truncate">
                  {orderDetails.itemName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {orderDetails.category ? `${orderDetails.category} · ` : ""}
                  {orderDetails.buyerName}
                  {orderDetails.store
                    ? ` · For ${orderDetails.store.name}`
                    : ""}
                </p>
                <ReportButton
                  type="SELLER_MISCONDUCT"
                  customRequestId={orderId}
                  label="Report this conversation"
                  className="text-xs text-slate-400 hover:text-rose-500"
                />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-[#fcfbf9]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[80%] ${msg.sender === "artisan" ? "self-end flex-row-reverse" : "self-start"}`}
                >
                  <div className="mt-auto">
                    {msg.sender === "artisan" ? (
                      <Avatar name={session?.name} src={session?.image} size={32} />
                    ) : (
                      <Avatar name={orderDetails.buyerName} src={orderDetails.user?.image} size={32} />
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-2xl ${
                      msg.sender === "artisan"
                        ? "bg-[#eedbc5] text-slate-800 rounded-br-none"
                        : "bg-white border border-slate-100 shadow-sm text-slate-700 rounded-bl-none"
                    }`}
                  >
                    {msg.type === "text" && (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    )}

                    {msg.type === "audio" && (
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <button className="w-10 h-10 rounded-full bg-[#d35400] text-white flex items-center justify-center shrink-0 shadow-sm hover:bg-[#b64b2b]">
                          <PlayIcon size={18} fill="currentColor" />
                        </button>
                        <div className="flex-1 h-8 flex items-center gap-1">
                          {/* Static Array to prevent Hydration Mismatch */}
                          {[
                            30, 60, 40, 80, 50, 100, 45, 70, 35, 90, 55, 75, 25,
                            65, 40,
                          ].map((height, i) => (
                            <div
                              key={i}
                              className="w-1 bg-slate-300 rounded-full transition-all"
                              style={{ height: `${height}%` }}
                            ></div>
                          ))}
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                          {msg.duration}
                        </span>
                      </div>
                    )}

                    {msg.type === "images" && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {msg.images.map((img, i) => (
                          <Image
                            key={i}
                            src={img}
                            alt="reference"
                            width={120}
                            height={120}
                            className="rounded-lg object-cover w-full h-24"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-5 bg-white border-t border-slate-100">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-3 bg-[#faf8f5] p-2 rounded-full border border-slate-200 focus-within:border-[#e67e22] transition-colors"
              >
                <input
                  suppressHydrationWarning
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent outline-none px-4 text-sm text-slate-700"
                  disabled={isSending}
                />
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <MicIcon size={20} />
                </button>
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <CameraIcon size={20} />
                </button>
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSending}
                  className="w-10 h-10 rounded-full bg-[#d35400] text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-sm"
                >
                  <SendIcon size={18} />
                </button>
              </form>
            </div>
          </div>

          {/* ========================================== */}
          {/* RIGHT COLUMN (Details & Proposal) */}
          {/* ========================================== */}
          <div className="flex flex-col gap-6 h-[750px] pb-2">
            {/* ORDER DETAILS CARD */}
            <div className="card-scrollbar bg-white rounded-3xl p-6 shadow-sm border border-slate-50 flex-1 min-h-0 overflow-y-auto">
              {/* Card header: title on the left, "Show more" → /request-view
                  on the right. Sellers land here from a card click; this link
                  lets them open the buyer's read view for the full spec. */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Order details
                </p>
                <Link
                  href={`/custom/request-view/${orderId}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2582eb] hover:text-[#1c355e] transition-colors"
                >
                  Show more
                  <ArrowUpRightIcon size={14} />
                </Link>
              </div>
              <div className="flex gap-4">
                <div className="w-32 h-40 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={orderDetails.mainImage}
                    alt={orderDetails.itemName}
                    width={150}
                    height={200}
                    className="w-full h-full object-cover"
                    unoptimized={isDataUrl(orderDetails.mainImage)}
                  />
                </div>

                <div className="flex-1 flex flex-col gap-3 text-sm text-slate-700 min-w-0">
                  {orderDetails.category ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 w-fit">
                      {orderDetails.category}
                    </span>
                  ) : null}
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Material:</p>
                    <p className="font-medium">{orderDetails.material}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Quantity:</p>
                    <p className="font-medium">{orderDetails.quantity}</p>
                  </div>
                  {orderDetails.size &&
                  (orderDetails.size.length ||
                    orderDetails.size.width ||
                    orderDetails.size.height) ? (
                    <div>
                      <p className="text-slate-400 text-xs mb-1">
                        Size (L × W × H cm):
                      </p>
                      <p className="font-medium text-xs">
                        {[
                          orderDetails.size.length,
                          orderDetails.size.width,
                          orderDetails.size.height,
                        ]
                          .map((n) => (n !== "" && n != null ? n : "—"))
                          .join(" × ")}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Colors:</p>
                    <div className="flex flex-col gap-2">
                      {orderDetails.colors.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full shadow-sm border border-slate-200 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          ></span>
                          <span className="text-xs leading-tight">
                            {color.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-slate-400 text-xs mb-1.5">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {orderDetails.description || "—"}
                </p>
              </div>

              {orderDetails.voiceNoteUrl ? (
                <div className="mt-6 p-4 bg-[#faf8f5] rounded-2xl">
                  <p className="font-medium text-slate-800 text-sm mb-2">
                    Buyer voice memo
                  </p>
                  <audio
                    controls
                    src={orderDetails.voiceNoteUrl}
                    className="w-full h-10"
                  />
                </div>
              ) : null}
            </div>

            {/* NEGOTIATION CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50">
              <h3 className="text-lg font-bold text-[#1c355e] mb-5">
                Your Proposal
              </h3>

              <div className="flex flex-col gap-5">
                {/* Deadline Logic Switch */}
                <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-700">
                    Delivery Deadline
                  </p>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-600 group-hover:text-slate-900">
                      Accept buyer&apos;s date (
                      {orderDetails.buyerDeadline || "not specified"})
                    </span>
                    <div className="relative inline-flex items-center">
                      <input
                        suppressHydrationWarning
                        type="checkbox"
                        className="sr-only peer"
                        checked={acceptBuyerDate}
                        onChange={() => setAcceptBuyerDate(!acceptBuyerDate)}
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-[#e67e22] transition-colors duration-200"></div>
                      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5"></span>
                    </div>
                  </label>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Proposed Delivery Date
                    </label>
                    <div
                      className={`flex items-center border rounded-xl px-3 transition-colors ${acceptBuyerDate && orderDetails.buyerDeadline ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-300 focus-within:border-[#e67e22] focus-within:ring-1 focus-within:ring-[#e67e22]"}`}
                    >
                      <CalendarIcon size={16} className="text-slate-400" />
                      <input
                        suppressHydrationWarning
                        type="date"
                        value={
                          acceptBuyerDate
                            ? orderDetails.buyerDeadline || proposedDate
                            : proposedDate
                        }
                        onChange={(e) => setProposedDate(e.target.value)}
                        disabled={
                          acceptBuyerDate && Boolean(orderDetails.buyerDeadline)
                        }
                        className="w-full p-2.5 outline-none bg-transparent text-sm text-slate-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Proposed Price
                    </label>
                    <div className="flex items-center border border-slate-300 rounded-xl px-3 bg-white focus-within:border-[#e67e22] focus-within:ring-1 focus-within:ring-[#e67e22] transition-colors">
                      <span className="text-xs font-semibold text-slate-500 pr-2">
                        EGP
                      </span>
                      <input
                        suppressHydrationWarning
                        type="number"
                        min="1"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full p-2.5 outline-none bg-transparent text-sm text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleNegotiate}
                  disabled={isSending}
                  className="w-full mt-2 bg-[#b64b2b] hover:bg-[#9c4024] disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-medium rounded-full py-3.5 transition-all hover:shadow-md active:scale-95 text-lg"
                >
                  {isSending ? "Sending..." : "Send Proposal"}
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-1">
                  By negotiating, you commit to this price and deadline.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
