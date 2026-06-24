'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { WarehouseIcon } from 'lucide-react'
import Loading from '@/components/Loading'
import { assets } from '@/assets/assets'
import { fetchSettings, updateSettings, uploadImage } from '@/lib/api/seller'

function sanitizeUsername(raw) {
    const s = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    return (s || 'shop').slice(0, 40)
}

export default function StoreSettings() {
    const session = useSelector((s) => s.auth.session)
    const storeId = session?.storeId

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [record, setRecord] = useState(null)

    const [form, setForm] = useState({
        name: '',
        username: '',
        description: '',
        email: '',
        contact: '',
        address: '',
        image: null, // newly picked File, if any
    })

    useEffect(() => {
        let cancelled = false
        const run = async () => {
            if (!storeId) {
                setLoading(false)
                return
            }
            // The .NET seller settings endpoint is the only source of truth.
            let api = null
            try {
                api = await fetchSettings()
            } catch {
                api = null
            }
            if (cancelled) return
            if (!api) {
                setLoading(false)
                return
            }
            setRecord(api)
            setForm({
                name: api.name || '',
                username: api.username || '',
                description: api.description || '',
                email: api.email || '',
                contact: api.contact || '',
                address: api.address || '',
                image: null,
            })
            setLoading(false)
        }
        run()
        return () => { cancelled = true }
    }, [storeId])

    const onChangeHandler = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        if (!record || !session?.userId) {
            toast.error('Sign in to edit your store')
            return
        }
        const name = form.name.trim()
        const email = form.email.trim()
        const contact = form.contact.trim()

        if (!name || !email || !contact) {
            toast.error('Name, email and contact are required')
            return
        }

        setSaving(true)
        try {
            // Upload a freshly picked logo and use the hosted URL; otherwise
            // keep the existing one.
            let logoUrl = record.logo || null
            if (form.image instanceof File) {
                try {
                    const url = await uploadImage(form.image)
                    if (url) logoUrl = url
                } catch {
                    toast.error('Could not upload the logo — keeping the previous image')
                }
            }

            // The username is ENFORCED — it's fixed when the store is created (like the
            // "Sell on Manzili" form) and can't be changed here. Always send the existing one.
            const payload = {
                name,
                username: record.username,
                description: form.description.trim(),
                email,
                contact,
                logo: logoUrl,
                address: form.address.trim(),
            }

            // Persist to the .NET seller settings endpoint. The returned record
            // is the source of truth; throws bubble to the catch below.
            const saved = await updateSettings(payload)
            const nextRecord = saved
                ? { ...record, ...saved, logo: saved.logo || logoUrl }
                : { ...record, ...payload }

            setRecord(nextRecord)
            setForm((prev) => ({ ...prev, image: null }))
            toast.success('Store details updated')
        } catch (err) {
            toast.error(err?.message || 'Could not save store details')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Loading />

    if (!record) {
        return (
            <div className="text-slate-500 mb-28">
                <h1 className="text-2xl">
                    Store <span className="text-slate-800 font-medium">Settings</span>
                </h1>
                <p className="mt-6 text-sm">
                    No store linked to this account.{' '}
                    <Link href="/create-store" className="text-[#2582eb] hover:underline">
                        Create your store
                    </Link>
                    .
                </p>
            </div>
        )
    }

    const logoPreviewSrc =
        form.image instanceof File
            ? URL.createObjectURL(form.image)
            : record.logo || assets.logo

    return (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">
                Store <span className="text-slate-800 font-medium">Settings</span>
            </h1>
            <p className="max-w-lg mt-1 text-sm">
                Update how your shop appears across Manzili.
            </p>

            <form onSubmit={onSubmit} className="max-w-7xl flex flex-col items-start gap-3 mt-8">
                <label className="cursor-pointer">
                    Store Logo
                    <Image
                        src={logoPreviewSrc}
                        className="rounded-lg mt-2 h-16 w-auto object-contain max-w-[200px]"
                        alt=""
                        width={150}
                        height={100}
                        unoptimized={form.image instanceof File}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })}
                        hidden
                    />
                </label>

                <p>Username <span className="text-xs text-slate-400">(permanent — set when you opened your store)</span></p>
                <input
                    name="username"
                    value={form.username}
                    type="text"
                    readOnly
                    disabled
                    aria-readonly="true"
                    title="Your store username is fixed and cannot be changed."
                    className="border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed w-full max-w-lg p-2 rounded"
                />

                <p>Name</p>
                <input
                    name="name"
                    onChange={onChangeHandler}
                    value={form.name}
                    type="text"
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                    required
                />

                <p>Description</p>
                <textarea
                    name="description"
                    onChange={onChangeHandler}
                    value={form.description}
                    rows={5}
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                />

                <p>Email</p>
                <input
                    name="email"
                    onChange={onChangeHandler}
                    value={form.email}
                    type="email"
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                    required
                />

                <p>Contact Number</p>
                <input
                    name="contact"
                    onChange={onChangeHandler}
                    value={form.contact}
                    type="text"
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                    required
                />

                <p className="mt-2">Public location (shown on your storefront)</p>
                <input
                    name="address"
                    onChange={onChangeHandler}
                    value={form.address}
                    type="text"
                    placeholder="e.g. Cairo, Egypt"
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                />

                {/* Shipping pickup is handled by warehouses, not this freeform field. */}
                <div className="mt-3 w-full max-w-lg rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
                    <WarehouseIcon size={20} className="text-[#2582eb] mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="text-slate-700 font-medium">Shipping pickup addresses</p>
                        <p className="text-slate-500 mt-0.5">
                            Bosta collects your orders from your <strong>warehouses</strong>. Add or edit
                            them — and choose your default — on the{' '}
                            <Link href="/store/warehouses" className="text-[#2582eb] hover:underline">
                                Warehouses
                            </Link>{' '}
                            page.
                        </p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="bg-slate-800 text-white px-12 py-2 rounded mt-10 active:scale-95 hover:bg-slate-900 transition disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save changes'}
                </button>
            </form>
        </div>
    )
}
