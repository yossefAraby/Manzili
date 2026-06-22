'use client'
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { fetchModerators, setModeratorPermissions } from "@/lib/api/admin"

const SECTIONS = [
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "stores", label: "Stores" },
  { key: "reports", label: "Reports" },
  { key: "requests", label: "Custom Requests" },
  { key: "coupons", label: "Coupons" },
]

/**
 * Full administrators (yossef / dinamow) manage which dashboard sections each moderator (smak)
 * may access. AdminLayout already keeps non-super-admins off this page.
 */
export default function AdminModerators() {
  const [mods, setMods] = useState([])
  const [draft, setDraft] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  const load = async () => {
    setLoading(true)
    const list = await fetchModerators()
    setMods(list)
    const next = {}
    list.forEach((m) => { next[m.id] = [...(m.permissions || [])] })
    setDraft(next)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = (modId, key) => {
    setDraft((prev) => {
      const cur = new Set(prev[modId] || [])
      if (cur.has(key)) cur.delete(key)
      else cur.add(key)
      return { ...prev, [modId]: [...cur] }
    })
  }

  const save = async (modId) => {
    setSavingId(modId)
    try {
      await setModeratorPermissions(modId, draft[modId] || [])
      toast.success("Permissions updated")
      await load()
    } catch (e) {
      toast.error(e?.message || "Could not update permissions")
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="text-slate-500 mb-28 max-w-3xl">
      <h1 className="text-2xl text-slate-500 mb-1">
        Moderators <span className="text-slate-800 font-medium">&amp; Permissions</span>
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        Choose which dashboard sections each moderator can manage. Full administrators always have
        full access and can&apos;t be restricted here.
      </p>

      {mods.length === 0 ? (
        <p className="text-sm text-slate-500">No moderators yet.</p>
      ) : (
        mods.map((m) => (
          <div key={m.id} className="border border-slate-200 rounded-xl p-5 mb-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-slate-800">{m.name || m.email || `#${m.id}`}</p>
                {m.email && <p className="text-xs text-slate-400">{m.email}</p>}
              </div>
              <button
                onClick={() => save(m.id)}
                disabled={savingId === m.id}
                className="text-sm bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-slate-900 disabled:opacity-50 active:scale-95 transition"
              >
                {savingId === m.id ? "Saving…" : "Save"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SECTIONS.map((s) => {
                const checked = (draft[m.id] || []).includes(s.key)
                return (
                  <label
                    key={s.key}
                    className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer transition ${
                      checked
                        ? "border-[#2582eb] bg-blue-50 text-slate-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(m.id, s.key)}
                      className="accent-[#2582eb]"
                    />
                    {s.label}
                  </label>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
