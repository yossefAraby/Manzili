'use client'

import { XIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { addAddress } from '@/lib/features/address/addressSlice'
import { makeEntityId } from '@/lib/storage/localStorageEnvelope'
import { normalizeComparableName } from '@/lib/bosta/locations'

const DEFAULT_COUNTRY = 'Egypt'
const DEFAULT_COUNTRY_CODE = 'EG'

function uniqueZonesFromDistricts(districtRows) {
    const map = new Map()
    for (const d of districtRows || []) {
        if (d.zoneId && d.zoneName) {
            map.set(d.zoneId, { id: d.zoneId, name: d.zoneName })
        }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/** Zones list when district rows do not carry zoneId (fallback to GET …/zones). */
function zoneOptionsFromZonesApi(zones) {
    return (zones || [])
        .map((z) => ({
            id: String(z?.id || ''),
            name: String(z?.name || ''),
        }))
        .filter((z) => z.id && z.name)
}

async function readJsonSafe(res) {
    try {
        return await res.json()
    } catch {
        return {}
    }
}

const AddressModal = ({ setShowAddressModal }) => {
    const dispatch = useDispatch()
    const session = useSelector((s) => s.auth.session)

    const [cities, setCities] = useState([])
    const [districtRows, setDistrictRows] = useState([])
    /** Zones returned by our API (includes districtNames for matching orphan districts). */
    const [zonesDetail, setZonesDetail] = useState([])
    const [zoneOptions, setZoneOptions] = useState([])

    const [loadingCities, setLoadingCities] = useState(true)
    const [loadingDistricts, setLoadingDistricts] = useState(false)
    const [bostaError, setBostaError] = useState(null)

    const [cityId, setCityId] = useState('')
    const [cityName, setCityName] = useState('')
    const [zoneId, setZoneId] = useState('')
    const [districtId, setDistrictId] = useState('')
    const [districtName, setDistrictName] = useState('')

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [street, setStreet] = useState('')
    const [building, setBuilding] = useState('')
    const [floor, setFloor] = useState('')
    const [apartment, setApartment] = useState('')
    const [zip, setZip] = useState('')

    const filteredDistricts = useMemo(() => {
        if (!zoneId) return districtRows
        return districtRows.filter((d) => {
            if (d.zoneId && d.zoneId === zoneId) return true
            if (d.zoneId) return false
            const z = zonesDetail.find((x) => x.id === zoneId)
            const names = Array.isArray(z.districtNames) ? z.districtNames : []
            return names.some((n) => normalizeComparableName(n) === normalizeComparableName(d.districtName))
        })
    }, [districtRows, zoneId, zonesDetail])

    const loadCities = useCallback(async () => {
        setLoadingCities(true)
        setBostaError(null)
        try {
            const res = await fetch('/api/bosta/cities')
            const data = await readJsonSafe(res)
            if (!res.ok) throw new Error(data?.error || 'Could not load cities')
            setCities(Array.isArray(data.cities) ? data.cities : [])
        } catch (e) {
            setBostaError(e?.message || 'Bosta cities unavailable')
            setCities([])
        } finally {
            setLoadingCities(false)
        }
    }, [])

    useEffect(() => {
        loadCities()
    }, [loadCities])

    useEffect(() => {
        if (session?.name) setName(session.name)
        if (session?.email) setEmail(session.email)
    }, [session?.name, session?.email])

    const onCityChange = async (e) => {
        const rawId = e.target.value
        const id = String(rawId || '').trim()
        setCityId(id)
        const c = cities.find((x) => x.id === id)
        setCityName(c?.name || '')
        setZoneId('')
        setDistrictId('')
        setDistrictName('')
        setDistrictRows([])
        setZonesDetail([])
        setZoneOptions([])
        if (!id) return

        setLoadingDistricts(true)
        setBostaError(null)
        try {
            const base = `/api/bosta/cities/${encodeURIComponent(id)}`
            const [dRes, zRes] = await Promise.all([fetch(`${base}/districts`), fetch(`${base}/zones`)])

            const dData = await readJsonSafe(dRes)
            const zData = await readJsonSafe(zRes)

            if (!dRes.ok) {
                throw new Error(dData?.error || 'Could not load districts')
            }

            const rows = Array.isArray(dData.districts) ? dData.districts : []
            const zonesFromApi = Array.isArray(zData.zones) ? zData.zones : []

            setDistrictRows(rows)
            setZonesDetail(zonesFromApi)

            let options = uniqueZonesFromDistricts(rows)
            if (options.length === 0 && zonesFromApi.length > 0) {
                options = zoneOptionsFromZonesApi(zonesFromApi)
            }
            setZoneOptions(options)

            if (rows.length === 0) {
                setBostaError('No districts returned for this governorate.')
            } else if (options.length === 0) {
                setBostaError('Could not determine zones for this governorate. Try again later.')
            }
        } catch (err) {
            setBostaError(err?.message || 'Could not load location data')
            setDistrictRows([])
            setZonesDetail([])
            setZoneOptions([])
        } finally {
            setLoadingDistricts(false)
        }
    }

    const onZoneChange = (e) => {
        setZoneId(e.target.value)
        setDistrictId('')
        setDistrictName('')
    }

    const onDistrictChange = (e) => {
        const id = e.target.value
        setDistrictId(id)
        const d = filteredDistricts.find((x) => x.districtId === id)
        setDistrictName(d?.districtName || '')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!cityId || !zoneId || !districtId) {
            toast.error('Select city, zone, and district')
            return
        }
        const resolvedName = (name || '').trim() || session?.name?.trim() || ''
        const resolvedEmail = (email || '').trim() || session?.email?.trim() || ''
        if (!resolvedName || !resolvedEmail) {
            toast.error('Please sign in so we can use your name and email on the order')
            return
        }
        const userId = session?.userId || 'guest'
        const firstLine = [street, building && `Bldg ${building}`, floor && `Fl ${floor}`, apartment && `Apt ${apartment}`]
            .filter(Boolean)
            .join(', ')

        dispatch(
            addAddress({
                id: makeEntityId('addr'),
                userId,
                name: resolvedName,
                email: resolvedEmail,
                street: firstLine || street,
                city: cityName,
                state: districtName,
                zip: zip || '',
                country: DEFAULT_COUNTRY,
                countryCode: DEFAULT_COUNTRY_CODE,
                phone,
                bostaCityId: cityId,
                bostaZoneId: zoneId,
                bostaDistrictId: districtId,
                bostaCityName: cityName,
                bostaZoneName: zoneOptions.find((z) => z.id === zoneId)?.name || '',
                bostaDistrictName: districtName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
        )
        setShowAddressModal(false)
    }

    return (
        <form
            onSubmit={(e) => toast.promise(handleSubmit(e), { loading: 'Saving address…' })}
            className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center overflow-y-auto py-10"
        >
            <div className="flex flex-col gap-4 text-slate-700 w-full max-w-md mx-6 bg-white/90 p-6 rounded-xl border border-slate-200 shadow-lg">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-semibold">
                        Delivery <span className="text-slate-900">address</span>
                    </h2>
                    <button type="button" onClick={() => setShowAddressModal(false)} className="p-1 text-slate-500 hover:text-slate-800">
                        <XIcon size={24} />
                    </button>
                </div>
                <p className="text-xs text-slate-500">
                    Choose governorate and district from Bosta so shipments validate. Country: {DEFAULT_COUNTRY}.
                </p>
                {bostaError && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{bostaError}</p>}

                {session?.userId && session?.name && session?.email ? (
                    <p className="text-xs text-slate-500 rounded border border-slate-100 bg-slate-50/80 px-3 py-2">
                        Delivering for <span className="font-medium text-slate-700">{session.name}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-600">{session.email}</span>
                    </p>
                ) : (
                    <>
                        <label className="flex flex-col gap-1 text-sm">
                            Full name
                            <input value={name} onChange={(e) => setName(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            Email
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                        </label>
                    </>
                )}
                <label className="flex flex-col gap-1 text-sm">
                    Phone
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    City / governorate
                    <select
                        value={cityId}
                        onChange={onCityChange}
                        className="p-2 border border-slate-200 rounded"
                        required
                        disabled={loadingCities}
                    >
                        <option value="">{loadingCities ? 'Loading cities…' : 'Select city'}</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    Zone
                    <select value={zoneId} onChange={onZoneChange} className="p-2 border border-slate-200 rounded" required disabled={!cityId || loadingDistricts}>
                        <option value="">{loadingDistricts ? 'Loading zones…' : 'Select zone'}</option>
                        {zoneOptions.map((z) => (
                            <option key={z.id} value={z.id}>
                                {z.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    District
                    <select
                        value={districtId}
                        onChange={onDistrictChange}
                        className="p-2 border border-slate-200 rounded"
                        required
                        disabled={!zoneId}
                    >
                        <option value="">Select district</option>
                        {filteredDistricts.map((d) => (
                            <option key={d.districtId} value={d.districtId}>
                                {d.districtName}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    Street / address line
                    <input value={street} onChange={(e) => setStreet(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                </label>
                <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1 text-sm col-span-1">
                        Building
                        <input value={building} onChange={(e) => setBuilding(e.target.value)} className="p-2 border border-slate-200 rounded" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm col-span-1">
                        Floor
                        <input value={floor} onChange={(e) => setFloor(e.target.value)} className="p-2 border border-slate-200 rounded" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm col-span-1">
                        Apartment
                        <input value={apartment} onChange={(e) => setApartment(e.target.value)} className="p-2 border border-slate-200 rounded" />
                    </label>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                    Postal code (optional)
                    <input value={zip} onChange={(e) => setZip(e.target.value)} className="p-2 border border-slate-200 rounded" />
                </label>

                <button type="submit" className="bg-slate-800 text-white text-sm font-medium py-2.5 rounded-md hover:bg-slate-900 transition-all">
                    Save address
                </button>
            </div>
        </form>
    )
}

export default AddressModal
