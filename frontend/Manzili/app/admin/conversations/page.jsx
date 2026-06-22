'use client'
import { useEffect, useState } from "react"
import { XIcon, UserIcon, StoreIcon } from "lucide-react"
import Image from "next/image"
import Loading from "@/components/Loading"
import { fetchConversations, fetchConversation } from "@/lib/api/admin"

/**
 * Read-only oversight of the buyer↔seller custom-order negotiation chats, for safety and
 * dispute resolution. Available to administrators.
 */
export default function AdminConversations() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    (async () => {
      setList(await fetchConversations())
      setLoading(false)
    })()
  }, [])

  const openChat = async (id) => {
    setLoadingDetail(true)
    setActive({ id })
    const detail = await fetchConversation(id)
    setActive(detail)
    setLoadingDetail(false)
  }

  if (loading) return <Loading />

  return (
    <div className="text-slate-500 mb-28 max-w-5xl">
      <h1 className="text-2xl text-slate-500 mb-1">
        Conversation <span className="text-slate-800 font-medium">Monitoring</span>
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Read-only oversight of buyer↔seller custom-order negotiations, for safety and dispute resolution.
      </p>

      {list.length === 0 ? (
        <p className="text-sm text-slate-500">No conversations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">Item</th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">Buyer</th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">Seller</th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">Status</th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">Messages</th>
                <th className="py-3 px-4 text-left font-semibold text-slate-600">Last activity</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-800 font-medium">{c.itemName}</td>
                  <td className="py-3 px-4 text-slate-700">{c.buyerName || "—"}</td>
                  <td className="py-3 px-4 text-slate-700">{c.sellerName || "—"}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#2582eb]/10 text-[#2582eb]">{c.status}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{c.messageCount}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => openChat(c.id)} className="text-xs text-[#2582eb] hover:underline">
                      View chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setActive(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-800 truncate">{active.itemName || "Conversation"}</h2>
                <p className="text-xs text-slate-500 truncate flex items-center gap-2">
                  <span className="inline-flex items-center gap-1"><UserIcon size={11} />{active.buyerName || "Buyer"}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><StoreIcon size={11} />{active.sellerName || "Seller"}</span>
                </p>
              </div>
              <button onClick={() => setActive(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <XIcon size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-[#fcfbf9] flex flex-col gap-4">
              {loadingDetail || !active.messages ? (
                <p className="text-sm text-slate-400 text-center">Loading messages…</p>
              ) : active.messages.length === 0 ? (
                <p className="text-sm text-slate-400 text-center">No messages in this conversation.</p>
              ) : (
                active.messages.map((m) => (
                  <div key={m.id} className={`flex flex-col max-w-[80%] ${m.author === "seller" ? "self-end items-end" : "self-start items-start"}`}>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                      {m.author === "seller" ? active.sellerName || "Seller" : active.buyerName || "Buyer"}
                    </span>
                    <div className={`p-3 rounded-2xl text-sm ${m.author === "seller" ? "bg-[#eedbc5] text-slate-800 rounded-br-none" : "bg-white border border-slate-100 text-slate-700 rounded-bl-none"}`}>
                      {m.text && <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                      {m.imageUrl && (
                        <div className="w-40 h-40 rounded-lg overflow-hidden relative border border-slate-100 mt-2">
                          <Image src={m.imageUrl} alt="attachment" width={160} height={160} className="object-cover w-full h-full" unoptimized />
                        </div>
                      )}
                    </div>
                    {m.createdAt && <span className="text-[10px] text-slate-400 mt-1">{new Date(m.createdAt).toLocaleString()}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
