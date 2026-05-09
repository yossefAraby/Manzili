"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  SendIcon,
  MicIcon,
  CameraIcon,
  PlayIcon,
  CalendarIcon,
  DollarSignIcon,
  ChevronLeftIcon,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import Loading from "@/components/Loading"; // استدعاء مكون التحميل الخاص بك

export default function CollaborationSpace() {
  const params = useParams();
  const orderId = params.id; // جلب الـ ID من الرابط
  const router = useRouter();
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

  // ==========================================
  // 1. STATES
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Form States
  const [messageInput, setMessageInput] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [acceptBuyerDate, setAcceptBuyerDate] = useState(true);

  // ==========================================
  // 2. DATA FETCHING (Backend Entry Point)
  // ==========================================
  useEffect(() => {
    const fetchCollaborationData = async () => {
      try {
        // 🛑 BACKEND DEVELOPER: Replace this block with your API Call
        // const res = await fetch(`/api/collaboration/${orderId}`)
        // const data = await res.json()

        // --- Simulated API Response ---
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockOrderDetails = {
          id: orderId,
          buyerName: "Amira",
          material: "Clay",
          quantity: 1,
          buyerDeadline: "2026-10-20",
          colors: [
            { hex: "#d35400", name: "Deep Terracotta (Core Color)" },
            { hex: "#eaddcf", name: "Speckle Cream Glaze" },
          ],
          mainImage:
            "https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=300&auto=format&fit=crop",
          voiceNoteUrl: "/mock-audio.mp3",
        };

        const mockMessages = [
          {
            id: 1,
            sender: "buyer",
            text: "Hello, can you modify the glaze pattern?",
            time: "10:00 AM",
            type: "text",
          },
          {
            id: 2,
            sender: "artisan",
            text: "Yes, of course, I can use a speckle pattern.",
            time: "10:05 AM",
            type: "text",
          },
          {
            id: 3,
            sender: "buyer",
            type: "audio",
            audioUrl: "/mock-audio.mp3",
            duration: "0:22",
            time: "10:10 AM",
          },
          {
            id: 4,
            sender: "artisan",
            text: "Hello, Ahmed voice note, changing the texture! project change.",
            time: "10:15 AM",
            type: "text",
          },
          {
            id: 5,
            sender: "buyer",
            type: "images",
            images: [
              "https://images.unsplash.com/photo-1578740263654-e6924f70b79e?q=80&w=150&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=150&auto=format&fit=crop",
            ],
            time: "10:20 AM",
          },
        ];

        setOrderDetails(mockOrderDetails);
        setMessages(mockMessages);
        setProposedDate(mockOrderDetails.buyerDeadline);
      } catch (error) {
        toast.error("Failed to load collaboration data.");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchCollaborationData();
    }
  }, [orderId]);

  // ==========================================
  // 3. ACTION HANDLERS (Backend Entry Points)
  // ==========================================

  // إرسال رسالة في الشات
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      setIsSending(true);

      // 🛑 BACKEND DEVELOPER: Add API Call here
      /*
            const payload = {
                orderId: orderId,
                text: messageInput,
                type: 'text'
            }
            await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            */

      // Optimistic UI Update
      const newMessage = {
        id: Date.now(),
        sender: "artisan", // Or 'buyer' based on logged in user
        text: messageInput,
        type: "text",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput("");
    } catch (error) {
      toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  // إرسال طلب التفاوض
  const handleNegotiate = async () => {
    if (!proposedPrice || proposedPrice <= 0) {
      return toast.error("Please enter a valid price.");
    }

    const finalDate = acceptBuyerDate
      ? orderDetails.buyerDeadline
      : proposedDate;
    if (!finalDate) {
      return toast.error("Please select a delivery date.");
    }

    try {
      setIsSending(true);

      // 🛑 BACKEND DEVELOPER: Add API Call here
      /*
            const payload = {
                orderId: orderId,
                price: Number(proposedPrice),
                deliveryDate: finalDate
            }
            await fetch('/api/collaboration/negotiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            */

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock delay
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
      <div className="text-center mt-20 text-slate-500">Order not found.</div>
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
            {/* Chat Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-white z-10">
              <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden shrink-0">
                <Image
                  src="https://i.pravatar.cc/150?u=amira"
                  alt="Buyer"
                  width={40}
                  height={40}
                />
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Buyer - {orderDetails.buyerName}
                </p>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-[#fcfbf9]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[80%] ${msg.sender === "artisan" ? "self-end flex-row-reverse" : "self-start"}`}
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
          <div className="flex flex-col gap-6 h-[750px] overflow-y-auto no-scrollbar pb-2">
            {/* ORDER DETAILS CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50">
              <div className="flex gap-4">
                <div className="w-32 h-40 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={orderDetails.mainImage}
                    alt="Project"
                    width={150}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 flex flex-col gap-3 text-sm text-slate-700">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Material:</p>
                    <p className="font-medium">{orderDetails.material}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Quantity:</p>
                    <p className="font-medium">{orderDetails.quantity}</p>
                  </div>
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

              {/* Voice Note Player */}
              <div className="mt-6 p-4 bg-[#faf8f5] rounded-2xl flex items-center gap-4">
                <button className="w-12 h-12 rounded-full bg-[#d35400] text-white flex items-center justify-center shrink-0 shadow-md hover:bg-[#b64b2b] transition-colors">
                  <PlayIcon size={20} fill="currentColor" />
                </button>
                <div>
                  <p className="font-medium text-slate-800 text-sm">
                    Play Main Project Proposal
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detailed project description from buyer
                  </p>
                </div>
              </div>
            </div>

            {/* NEGOTIATION CARD */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50 mt-auto">
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
                      Accept buyer's date ({orderDetails.buyerDeadline})
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
                      className={`flex items-center border rounded-xl px-3 transition-colors ${acceptBuyerDate ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-300 focus-within:border-[#e67e22] focus-within:ring-1 focus-within:ring-[#e67e22]"}`}
                    >
                      <CalendarIcon size={16} className="text-slate-400" />
                      <input
                        suppressHydrationWarning
                        type="date"
                        value={
                          acceptBuyerDate
                            ? orderDetails.buyerDeadline
                            : proposedDate
                        }
                        onChange={(e) => setProposedDate(e.target.value)}
                        disabled={acceptBuyerDate}
                        className="w-full p-2.5 outline-none bg-transparent text-sm text-slate-800 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Proposed Price
                    </label>
                    <div className="flex items-center border border-slate-300 rounded-xl px-3 bg-white focus-within:border-[#e67e22] focus-within:ring-1 focus-within:ring-[#e67e22] transition-colors">
                      <DollarSignIcon size={16} className="text-slate-400" />
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
                  {isSending ? "Sending..." : "Negotiate"}
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
