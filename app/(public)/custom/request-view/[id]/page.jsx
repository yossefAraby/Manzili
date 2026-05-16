"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
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
} from "lucide-react";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import AddressModal from "@/components/AddressModal";
import {
  OFFER_STATUS,
  acceptOffer,
  appendOfferChatMessage,
  blockOffer,
  declineOffer,
  getCustomRequestById,
  listOffersByRequestId,
  markOfferPaid,
} from "@/lib/services/localCustomRequestService";
import {
  notifyOfferAccepted,
  notifyOfferBlocked,
  notifyOfferDeclined,
  notifyOrderPaid,
} from "@/lib/services/customOrderNotifications";

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

/** Convert the offer's persisted `comments` history into chat lanes.
 *  Buyer (the local user) renders on the right ("buyer" sender). */
function commentsToMessages(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.map((c) => ({
    id: c.id,
    sender: c.author === "buyer" ? "buyer" : "seller",
    type: "text",
    text: c.text,
    time: new Date(c.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}

const ESTIMATED_SHIPPING_FALLBACK = 60;

export default function RequestViewPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const requestId = params.id;
  const currency = "EGP";

  const session = useSelector((s) => s.auth.session);
  const currentUserId = session?.userId || null;
  const buyerName = session?.name || "Buyer";
  const addressList = useSelector((s) => s.address.list);

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

  // Chat
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState([]);

  // ---- loader ---------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!requestId) return;
    try {
      const [raw, list] = await Promise.all([
        getCustomRequestById(requestId),
        listOffersByRequestId(requestId),
      ]);
      setRequest(raw);
      setOffers(list);
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
        [OFFER_STATUS.ACCEPTED, OFFER_STATUS.READY_TO_SHIP, OFFER_STATUS.PAID].includes(o.status),
      ) ?? null,
    [offers],
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

  // Seed chat from comment history any time the active offer changes.
  // Without this, accepting an offer would land in an empty chat — the
  // whole point of "comments transfer to chat" is that the buyer/seller
  // back-and-forth that happened in the proposal cards is preserved.
  useEffect(() => {
    if (!request) {
      setMessages([]);
      return;
    }
    const intro = {
      id: "intro",
      sender: "buyer",
      type: "text",
      text: request.description || "No description provided.",
      time: "",
    };
    if (activeOffer && Array.isArray(activeOffer.comments) && activeOffer.comments.length > 0) {
      setMessages([intro, ...commentsToMessages(activeOffer.comments)]);
    } else {
      setMessages([intro]);
    }
  }, [request?.id, activeOffer?.id, activeOffer?.comments?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- handlers -------------------------------------------------------------
  const handleEdit = () => {
    router.push(`/custom/custom-form?edit=${encodeURIComponent(request.id)}`);
  };

  const handleAccept = async (offer) => {
    try {
      const buyerComment = (buyerComments[offer.id] || "").trim() || null;
      await acceptOffer(offer.id, { buyerComment });
      await refresh();
      if (offer.sellerId) {
        notifyOfferAccepted({
          sellerUserId: offer.sellerId,
          buyerName,
          requestId,
          itemName: request?.itemName,
          dispatch,
          currentUserId,
        });
      }
      toast.success("Proposal accepted.");
    } catch {
      toast.error("Could not accept proposal.");
    }
  };

  const handleDecline = async (offer) => {
    try {
      const buyerComment = (buyerComments[offer.id] || "").trim() || null;
      await declineOffer(offer.id, { buyerComment });
      await refresh();
      if (offer.sellerId) {
        notifyOfferDeclined({
          sellerUserId: offer.sellerId,
          buyerName,
          requestId,
          itemName: request?.itemName,
          dispatch,
          currentUserId,
        });
      }
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
      await blockOffer(offer.id, { buyerComment });
      setBlockTaps({ ...blockTaps, [offer.id]: 0 });
      await refresh();
      if (offer.sellerId) {
        notifyOfferBlocked({
          sellerUserId: offer.sellerId,
          buyerName,
          requestId,
          itemName: request?.itemName,
          dispatch,
          currentUserId,
        });
      }
      toast("Seller blocked for this request.");
    } catch {
      toast.error("Could not block seller.");
    }
  };

  const handlePay = async () => {
    if (!activeOffer) return;
    if (!selectedAddress) {
      toast.error("Please select or add a shipping address.");
      return;
    }
    try {
      await markOfferPaid(activeOffer.id, { address: selectedAddress, paymentMethod });
      await refresh();
      if (activeOffer.sellerId) {
        notifyOrderPaid({
          sellerUserId: activeOffer.sellerId,
          buyerName,
          requestId,
          itemName: request?.itemName,
          dispatch,
          currentUserId,
        });
      }
      toast.success("Order finalized.");
    } catch {
      toast.error("Could not complete payment.");
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
      await appendOfferChatMessage(activeOffer.id, { author: "buyer", text });
    } catch {
      /* non-fatal */
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

  const showPaymentCard = activeOffer && activeOffer.status === OFFER_STATUS.READY_TO_SHIP;
  const showPaidBanner = activeOffer && activeOffer.status === OFFER_STATUS.PAID;

  const subtotal = activeOffer ? Number(activeOffer.price || 0) : 0;
  const total = subtotal + ESTIMATED_SHIPPING_FALLBACK;

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

        {/* PAYMENT CARD (top) */}
        {isOwner && showPaymentCard && (
          <PaymentCard
            request={request}
            activeOffer={activeOffer}
            currency={currency}
            subtotal={subtotal}
            total={total}
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

        {/* CHAT + DETAILS RAIL */}
        {isOwner && activeOffer && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <ChatCard
              request={request}
              mainImage={mainImage}
              activeOffer={activeOffer}
              currency={currency}
              messages={messages}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              onSubmit={handleSendMessage}
            />
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
  return (
    <div className="card-enter mb-6 bg-white rounded-3xl shadow-md border-2 border-amber-300 overflow-hidden">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
          <CheckIcon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">Your order is ready to ship</p>
          <p className="text-xs text-amber-700/80">Confirm address and payment to finalize.</p>
        </div>
      </div>

      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
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

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-5 mb-3 flex items-center gap-1.5">
            <CreditCardIcon size={14} />
            Payment method
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
              <input type="radio" disabled className="accent-slate-500" />
              <span>Cash on delivery (unavailable)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={paymentMethod === "STRIPE"}
                onChange={() => setPaymentMethod("STRIPE")}
                className="accent-[#e67e22]"
              />
              <span>Stripe</span>
            </label>
          </div>
        </div>

        <div className="md:border-l md:border-slate-100 md:pl-6">
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
              <span>Subtotal</span>
              <span>{currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping (est.)</span>
              <span>{currency} {ESTIMATED_SHIPPING_FALLBACK.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>{currency} {total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={onPay}
            disabled={!selectedAddress}
            className="cta-morph w-full mt-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-full py-3 text-base shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckIcon size={18} />
            Confirm & Pay
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-2">
            Stripe demo — no real charge is made.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatCard({ request, mainImage, activeOffer, currency, messages, messageInput, setMessageInput, onSubmit }) {
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
                : "bg-blue-100 text-blue-700"
          }`}
        >
          {activeOffer.status === OFFER_STATUS.PAID
            ? "Paid"
            : activeOffer.status === OFFER_STATUS.READY_TO_SHIP
              ? "Ready to ship"
              : "Accepted"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-[#fcfbf9]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.sender === "buyer" ? "self-end flex-row-reverse" : "self-start"}`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto">
              <Image
                src={
                  msg.sender === "buyer"
                    ? "https://i.pravatar.cc/150?u=amira"
                    : "https://i.pravatar.cc/150?u=ahmed"
                }
                alt={msg.sender}
                width={32}
                height={32}
              />
            </div>
            <div
              className={`p-3 sm:p-4 rounded-2xl ${
                msg.sender === "buyer"
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
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0">
            <Image src="https://i.pravatar.cc/150?u=ahmed" alt={proposal.sellerName || "Seller"} width={40} height={40} />
          </div>
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
            aria-label={
              blockArmed
                ? tapsRemaining === 0
                  ? "Tap once more to block"
                  : "Tap twice more to block"
                : "Block this seller"
            }
            className={`cta-morph relative inline-flex items-center justify-center gap-1.5 rounded-full active:scale-95 font-medium transition-all duration-200 ${
              blockArmed
                ? "bg-rose-600 text-white shadow-lg ring-4 ring-rose-200 px-4 py-2.5 text-xs"
                : "bg-white text-slate-500 border border-slate-300 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 w-11 h-11 shrink-0 self-center"
            }`}
            title={
              blockArmed
                ? tapsRemaining === 0
                  ? "Tap once more to confirm"
                  : "Tap twice more to confirm"
                : "Block this seller"
            }
          >
            <ShieldOffIcon size={16} className="shrink-0" />
            {blockArmed && (
              <span className="whitespace-nowrap">
                {tapsRemaining === 0 ? "Tap once more to confirm" : "Tap twice more to confirm"}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
