'use client'

import { assets } from '@/assets/assets'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { setSession } from '@/lib/features/auth/authSlice'
import {
    createStoreForUser,
    findStoreByOwnerUserId,
    upsertStoreRecord,
} from '@/lib/services/localStoreRegistry'
import {
    persistAuthSession,
    reconcileAuthSession,
    setUserStoreId,
} from '@/lib/services/localStateBootstrap'
import StoreAddressFields, {
    EMPTY_STORE_ADDRESS,
    formatStoreAddress,
} from '@/components/store/StoreAddressFields'

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

export default function CreateStore() {
    const router = useRouter()
    const dispatch = useDispatch()
    const session = useSelector((s) => s.auth.session)

    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')

    const [storeInfo, setStoreInfo] = useState({
        name: '',
        username: '',
        description: '',
        email: '',
        contact: '',
        image: null,
    })
    const [address, setAddress] = useState(EMPTY_STORE_ADDRESS)

    const onChangeHandler = (e) => {
        setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value })
    }

    const fetchSellerStatus = async () => {
        const uid = session?.userId
        if (uid) {
            const existing = findStoreByOwnerUserId(uid)
            if (existing) {
                setAlreadySubmitted(true)
                setStatus(existing.status === 'approved' ? 'approved' : 'pending')
                setMessage(
                    existing.status === 'approved'
                        ? 'Your store is active. You can open the seller dashboard anytime.'
                        : 'Your store profile was submitted. An admin will review it shortly.'
                )
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchSellerStatus()
    }, [session?.userId])

    useEffect(() => {
        if (!session?.email && !session?.name) return
        setStoreInfo((prev) => ({
            ...prev,
            ...(session.email && !prev.email ? { email: session.email } : {}),
            ...(session.name && !prev.name ? { name: session.name } : {}),
        }))
    }, [session?.email, session?.name])

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        if (!session?.userId) {
            toast.error('Please log in to register a store')
            router.push('/login')
            throw new Error('Not logged in')
        }

        const name = storeInfo.name.trim()
        const usernameRaw = sanitizeUsername(storeInfo.username)
        const email = storeInfo.email.trim()
        const contact = storeInfo.contact.trim()

        if (!name || !usernameRaw || !email || !contact) {
            toast.error('Fill in store name, username, email, and contact')
            throw new Error('Incomplete form')
        }

        if (!address.bostaCityId || !address.bostaZoneId || !address.bostaDistrictId || !address.street.trim()) {
            toast.error('Pick a city, zone, district and enter a street for the store address')
            throw new Error('Incomplete address')
        }

        let logoDataUrl = null
        if (storeInfo.image instanceof File) {
            logoDataUrl = await fileToDataUrlIfSmall(storeInfo.image)
            if (logoDataUrl && logoDataUrl.length > MAX_LOGO_DATA_URL_CHARS) {
                toast.error('Logo image is too large after encoding — try a smaller file')
                throw new Error('Logo too large')
            }
        }

        const created = createStoreForUser({
            userId: session.userId,
            ownerName: session.name || name,
            ownerEmail: session.email || email,
            storeName: name,
        })

        if (!created.ok) {
            toast.error('You already have a store linked to this account.')
            setAlreadySubmitted(true)
            setMessage('You already registered a store.')
            throw new Error('Store exists')
        }

        let base = created.store
        const ownerEmail = session.email || email
        const ownerName = session.name || name

        base = {
            ...base,
            username: `${usernameRaw}_${base.id.slice(-6)}`,
            name,
            description: storeInfo.description.trim(),
            email,
            contact,
            address: formatStoreAddress(address),
            addressDetails: { ...address },
            logo: logoDataUrl || base.logo,
            updatedAt: new Date().toISOString(),
            user: {
                ...base.user,
                id: session.userId,
                name: ownerName,
                email: ownerEmail,
                image: logoDataUrl || base.user?.image || base.logo,
            },
        }

        upsertStoreRecord(base)
        setUserStoreId(session.userId, base.id)
        const next = reconcileAuthSession({
            ...session,
            storeId: base.id,
        })
        persistAuthSession(next)
        dispatch(setSession(next))

        toast.success('Store saved — welcome!')
        router.push('/store')
    }

    if (!loading && !session?.userId) {
        return (
            <div className="mx-6 min-h-[70vh] my-16 flex flex-col items-center justify-center gap-4 text-center">
                <p className="text-slate-600 max-w-md">
                    Log in or create an account before registering as a seller.
                </p>
                <Link href="/login" className="text-[#2582eb] font-medium hover:underline">
                    Go to login
                </Link>
            </div>
        )
    }

    return !loading ? (
        <>
            {!alreadySubmitted ? (
                <div className="mx-6 min-h-[70vh] my-16">
                    <form
                        onSubmit={(e) =>
                            toast.promise(onSubmitHandler(e), {
                                loading: 'Submitting…',
                                success: 'Done',
                                error: (err) => err?.message || 'Something went wrong',
                            })
                        }
                        className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500"
                    >
                        <div>
                            <h1 className="text-3xl ">
                                Add Your <span className="text-slate-800 font-medium">Store</span>
                            </h1>
                            <p className="max-w-lg">
                                To become a seller on Manzili, submit your store details for review. Your store will be
                                activated after admin verification.
                            </p>
                        </div>

                        <label className="mt-10 cursor-pointer">
                            Store Logo
                            <Image
                                src={
                                    storeInfo.image instanceof File
                                        ? URL.createObjectURL(storeInfo.image)
                                        : assets.upload_area
                                }
                                className="rounded-lg mt-2 h-16 w-auto object-contain max-w-[200px]"
                                alt=""
                                width={150}
                                height={100}
                                unoptimized={storeInfo.image instanceof File}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    setStoreInfo({ ...storeInfo, image: e.target.files?.[0] || null })
                                }
                                hidden
                            />
                        </label>

                        <p>Username</p>
                        <input
                            name="username"
                            onChange={onChangeHandler}
                            value={storeInfo.username}
                            type="text"
                            placeholder="your_store_name"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p>Name</p>
                        <input
                            name="name"
                            onChange={onChangeHandler}
                            value={storeInfo.name}
                            type="text"
                            placeholder="Enter your store name"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p>Description</p>
                        <textarea
                            name="description"
                            onChange={onChangeHandler}
                            value={storeInfo.description}
                            rows={5}
                            placeholder="Enter your store description"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                        />

                        <p>Email</p>
                        <input
                            name="email"
                            onChange={onChangeHandler}
                            value={storeInfo.email}
                            type="email"
                            placeholder="Enter your store email"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p>Contact Number</p>
                        <input
                            name="contact"
                            onChange={onChangeHandler}
                            value={storeInfo.contact}
                            type="text"
                            placeholder="Enter your store contact number"
                            className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                            required
                        />

                        <p className="mt-2">Address</p>
                        <p className="text-xs text-slate-400 -mt-2 max-w-lg">
                            Pick governorate, zone and district from Bosta so shipments validate — same flow as the
                            checkout address.
                        </p>
                        <StoreAddressFields value={address} onChange={setAddress} />

                        <button
                            type="submit"
                            className="bg-slate-800 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-slate-900 transition "
                        >
                            Submit
                        </button>
                    </form>
                </div>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6">
                    <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">
                        {message}
                    </p>
                    <Link href="/store" className="text-[#2582eb] font-medium hover:underline">
                        Open seller dashboard
                    </Link>
                    {status === 'approved' && (
                        <p className="mt-5 text-slate-400">
                            Use the dashboard to add products and manage orders.
                        </p>
                    )}
                </div>
            )}
        </>
    ) : (
        <Loading />
    )
}
