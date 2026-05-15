'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import Loading from '@/components/Loading'
import StoreAddressFields, {
    EMPTY_STORE_ADDRESS,
    formatStoreAddress,
} from '@/components/store/StoreAddressFields'
import { setSession } from '@/lib/features/auth/authSlice'
import { persistAuthSession, reconcileAuthSession } from '@/lib/services/localStateBootstrap'
import { findStoreById, upsertStoreRecord } from '@/lib/services/localStoreRegistry'

const MAX_LOGO_DATA_URL_CHARS = 450_000

function sanitizeUsername(raw) {
    const s = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    return (s || 'shop').slice(0, 40)
}

async function fileToDataUrlIfSmall(file) {
    if (!file || !(file instanceof File)) return null
    if (file.size > 512 * 1024) {
        toast.error('Logo must be under 512 KB')
        return null
    }
    return new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
        r.onerror = () => reject(new Error('Could not read image'))
        r.readAsDataURL(file)
    })
}

/**
 * Pull the structured address back off the stored record. Stores created before
 * this feature only have the freeform `address` string — we surface that as a
 * read-only hint and start the picker empty so the artisan can re-pick.
 */
function readStoredAddress(record) {
    if (record?.addressDetails && typeof record.addressDetails === 'object') {
        return { ...EMPTY_STORE_ADDRESS, ...record.addressDetails }
    }
    return EMPTY_STORE_ADDRESS
}

export default function StoreSettings() {
    const dispatch = useDispatch()
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
        image: null, // newly picked File, if any
    })
    const [address, setAddress] = useState(EMPTY_STORE_ADDRESS)

    const legacyAddressString = useMemo(() => {
        if (!record) return ''
        if (record.addressDetails) return ''
        return String(record.address || '').trim()
    }, [record])

    useEffect(() => {
        if (!storeId) {
            setLoading(false)
            return
        }
        const found = findStoreById(storeId)
        if (!found) {
            setLoading(false)
            return
        }
        setRecord(found)
        setForm({
            name: found.name || '',
            username: found.username || '',
            description: found.description || '',
            email: found.email || '',
            contact: found.contact || '',
            image: null,
        })
        setAddress(readStoredAddress(found))
        setLoading(false)
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
        const username = sanitizeUsername(form.username)
        const email = form.email.trim()
        const contact = form.contact.trim()

        if (!name || !username || !email || !contact) {
            toast.error('Name, username, email and contact are required')
            return
        }
        if (!address.bostaCityId || !address.bostaZoneId || !address.bostaDistrictId || !address.street.trim()) {
            toast.error('Pick a city, zone, district and enter a street')
            return
        }

        setSaving(true)
        try {
            let logoDataUrl = null
            if (form.image instanceof File) {
                logoDataUrl = await fileToDataUrlIfSmall(form.image)
                if (logoDataUrl && logoDataUrl.length > MAX_LOGO_DATA_URL_CHARS) {
                    toast.error('Logo image is too large after encoding — try a smaller file')
                    return
                }
            }

            // Keep the trailing `_xxxxxx` suffix the create flow attaches so the
            // username stays stable when only the human-readable part changes.
            const existingSuffix = (record.username || '').match(/_([a-z0-9]{6})$/i)?.[1] || record.id.slice(-6)
            const nextUsername = `${username}_${existingSuffix}`

            const next = {
                ...record,
                name,
                username: nextUsername,
                description: form.description.trim(),
                email,
                contact,
                address: formatStoreAddress(address),
                addressDetails: { ...address },
                logo: logoDataUrl || record.logo,
                updatedAt: new Date().toISOString(),
                user: {
                    ...record.user,
                    name: session.name || record.user?.name,
                    email: session.email || record.user?.email,
                    image: logoDataUrl || record.user?.image || record.logo,
                },
            }

            upsertStoreRecord(next)
            setRecord(next)
            setForm((prev) => ({ ...prev, image: null }))

            // Refresh session in case the sidebar's cached storeId payload diverges.
            const nextSession = reconcileAuthSession({ ...session, storeId: next.id })
            persistAuthSession(nextSession)
            dispatch(setSession(nextSession))

            toast.success('Store details updated')
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
        form.image instanceof File ? URL.createObjectURL(form.image) : record.logo

    return (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">
                Store <span className="text-slate-800 font-medium">Settings</span>
            </h1>
            <p className="max-w-lg mt-1 text-sm">
                Update how your shop appears across Manzili. Address uses the same picker as checkout.
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

                <p>Username</p>
                <input
                    name="username"
                    onChange={onChangeHandler}
                    value={form.username}
                    type="text"
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                    required
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

                <p className="mt-2">Address</p>
                {legacyAddressString && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 max-w-lg">
                        Your saved address is in the old free-text format: <em>{legacyAddressString}</em>. Pick
                        governorate / zone / district below to upgrade it to the validated format.
                    </p>
                )}
                <StoreAddressFields value={address} onChange={setAddress} />

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
