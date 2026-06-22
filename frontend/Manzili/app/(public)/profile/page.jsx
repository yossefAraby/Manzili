'use client'

import AddressModal from '@/components/AddressModal'
import Avatar from '@/components/Avatar'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { setSession } from '@/lib/features/auth/authSlice'
import { hydrateAddresses, deleteAddressRemote } from '@/lib/features/address/addressSlice'
import { fetchMe, updateProfile } from '@/lib/api/user'
import { uploadImage } from '@/lib/api/upload'
import { fetchRequests } from '@/lib/api/custom'
import { fetchSettings } from '@/lib/api/seller'
import { useTranslate } from '@/lib/i18n/LocaleContext'

const NAV = [
  { id: 'personal', label: 'Personal data' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'requests', label: 'Custom requests' },
  { id: 'store', label: 'Seller store', sellerOnly: true },
]

export default function ProfilePage() {
  const router = useRouter()
  const dispatch = useDispatch()
  const session = useSelector((s) => s.auth.session)
  const addressList = useSelector((s) => s.address.list)

  const [section, setSection] = useState('personal')
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [myRequests, setMyRequests] = useState([])
  const [storeRecord, setStoreRecord] = useState(null)
  const avatarInputRef = useRef(null)

  const t = useTranslate()

  useEffect(() => {
    if (!session?.userId) {
      router.replace('/login?next=%2Fprofile')
    }
  }, [session?.userId, router])

  // Seed drafts from session immediately, then refine from the API (fail safe).
  useEffect(() => {
    if (session?.name) setNameDraft(session.name)
    if (session?.email) setEmailDraft(session.email)
  }, [session?.name, session?.email])

  useEffect(() => {
    if (!session?.userId) return
    let cancelled = false
    ;(async () => {
      const me = await fetchMe() // null for guests / on error
      if (!cancelled && me) {
        if (me.name) setNameDraft(me.name)
        if (me.email) setEmailDraft(me.email)
        if (me.image) setAvatar(me.image)
        // Load the seller's own store settings (name + username) from the API.
        if (me.storeId) {
          try {
            const store = await fetchSettings()
            if (!cancelled && store) setStoreRecord(store)
          } catch {
            /* no store / unavailable — section stays hidden */
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session?.userId])

  // Hydrate the saved-addresses list from the API (fail safe; empty for guests).
  useEffect(() => {
    if (!session?.userId) return
    dispatch(hydrateAddresses())
  }, [session?.userId, dispatch])

  // Load this user's custom requests from the API and keep only their own.
  useEffect(() => {
    if (!session?.userId) return
    let cancelled = false
    ;(async () => {
      const all = await fetchRequests() // [] on error
      const mine = (all || []).filter((r) => r.ownerUserId === session.userId)
      if (!cancelled) setMyRequests(mine)
    })()
    return () => {
      cancelled = true
    }
  }, [session?.userId])

  const savePersonal = async (e) => {
    e.preventDefault()
    if (!session?.userId) return
    const updated = await updateProfile({ name: nameDraft })
    if (!updated) {
      toast.error(t('profile.couldNotSave') || 'Could not save profile.')
      return
    }
    const nextSession = {
      ...session,
      name: updated.name || nameDraft,
      email: updated.email || session.email,
    }
    dispatch(setSession(nextSession))
    toast.success(t('profile.profileUpdated'))
  }

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file) // throws on failure
      if (!url) throw new Error('No URL returned')
      const updated = await updateProfile({ image: url })
      const nextImage = updated?.image || url
      setAvatar(nextImage)
      const nextSession = { ...session, image: nextImage }
      dispatch(setSession(nextSession))
      toast.success(t('profile.profileUpdated'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const removeAddress = (id) => {
    // Optimistic + server delete; deleteAddressRemote drops it locally on fulfilment.
    dispatch(deleteAddressRemote(id))
  }

  if (!session?.userId) {
    return (
      <div className="min-h-[50vh] mx-6 flex items-center justify-center text-slate-500">
        <p className="text-sm">{t('common.loading')}</p>
      </div>
    )
  }

  const navItems = NAV.filter((item) => !item.sellerOnly || storeRecord)

  return (
    <div className="mx-auto mb-28 max-w-5xl px-6 text-slate-500">
      <h1 className="text-2xl">
        {t('profile.title')}
      </h1>
      <p className="text-sm mt-2 text-slate-500">
        Manage personal details, addresses, and custom orders in one place.
      </p>

      <div className="flex flex-col lg:flex-row gap-10 mt-8">
        <nav className="flex lg:flex-col flex-wrap gap-2 lg:border-r lg:border-slate-200 lg:pr-8 lg:min-w-[11rem]">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${section === item.id ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-8">
          {section === 'personal' && (
            <div className="border border-slate-200 rounded-lg p-6 max-w-lg">
              <h2 className="text-slate-800 font-medium text-lg mb-4">Personal data</h2>

              {/* Avatar picker → uploads to the API, then patches the profile image. */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar name={nameDraft} src={avatar} size={64} />
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarPick}
                    className="hidden"
                    id="avatar-input"
                  />
                  <label
                    htmlFor="avatar-input"
                    className={`text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer ${uploadingAvatar ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    {uploadingAvatar ? (t('common.loading')) : (t('profile.changePhoto') || 'Change photo')}
                  </label>
                </div>
              </div>

              <form onSubmit={savePersonal} className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-600 mb-1">{t('profile.name')}</label>
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#2582eb] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">{t('profile.email')}</label>
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    required
                    disabled
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none bg-slate-50 text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2582eb] text-white font-medium hover:opacity-90"
                >
                  {t('profile.saveChanges')}
                </button>
              </form>
            </div>
          )}

          {section === 'addresses' && (
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-slate-800 font-medium text-lg">Addresses</h2>
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(true)}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Add address
                </button>
              </div>
              {addressModalOpen ? (
                <AddressModal setShowAddressModal={() => setAddressModalOpen(false)} />
              ) : null}
              {(addressList || []).length === 0 ? (
                <p className="text-sm text-slate-500">No saved addresses yet.</p>
              ) : (
                <ul className="space-y-3">
                  {(addressList || []).map((a) => (
                    <li key={a.id} className="flex flex-wrap justify-between gap-3 border border-slate-100 rounded-lg p-4 text-sm">
                      <div className="text-slate-600">
                        <p className="font-medium text-slate-800">{a.name}</p>
                        <p>
                          {a.street}, {a.city}, {a.state} {a.zip}
                        </p>
                        <p className="text-slate-500">{a.country}</p>
                        {a.phone ? <p>{a.phone}</p> : null}
                      </div>
                      <button
                        type="button"
                        className="self-start text-red-600 text-sm hover:underline"
                        onClick={() => removeAddress(a.id)}
                      >
                        {t('common.delete')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {section === 'requests' && (
            <div className="border border-slate-200 rounded-lg p-6">
              <h2 className="text-slate-800 font-medium text-lg mb-4">Your custom requests</h2>
              {(myRequests || []).length === 0 ? (
                <p className="text-sm text-slate-500 mb-4">No saved requests tied to this account yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(myRequests || []).map((r) => (
                    <li key={r.id} className="py-4 text-sm flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800">{r.itemName}</p>
                        <p className="text-slate-500 line-clamp-2">{r.description}</p>
                        {r.createdAt ? (
                          <p className="text-xs text-slate-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                        ) : null}
                      </div>
                      <Link href={`/collaboration/${r.id}`} className="text-[#2582eb] text-sm shrink-0">
                        Open →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/custom/custom-form" className="inline-block mt-6 text-sm text-[#2582eb]">
                Submit a custom order
              </Link>
            </div>
          )}

          {section === 'store' && storeRecord ? (
            <div className="border border-slate-200 rounded-lg p-6 max-w-xl">
              <h2 className="text-slate-800 font-medium text-lg mb-2">Seller store</h2>
              <p className="text-sm text-slate-500 mb-6">
                {storeRecord.name} — public shop{' '}
                <span className="text-slate-700">@{storeRecord.username}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/store"
                  className="inline-flex px-5 py-2 rounded-lg bg-slate-100 text-slate-800 font-medium hover:bg-slate-200 text-sm"
                >
                  Seller dashboard
                </Link>
                <Link
                  href={`/shop/${storeRecord.username}`}
                  className="inline-flex px-5 py-2 rounded-lg border border-slate-200 text-sm text-[#2582eb]"
                >
                  View storefront
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
