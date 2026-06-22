'use client'

import { XIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { createAddressRemote } from '@/lib/features/address/addressSlice'
import { normalizeComparableName } from '@/lib/bosta/locations'
import { fetchCities, fetchZones, fetchDistricts } from '@/lib/api/shipping'
import { useTranslate } from '@/lib/i18n/LocaleContext'

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

const AddressModal = ({ setShowAddressModal }) => {
    const dispatch = useDispatch()
    const t = useTranslate()
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
        const list = await fetchCities() // [] on error
        setCities(list)
        if (list.length === 0) {
            setBostaError(t('addressModal.couldNotLoadCities'))
        }
        setLoadingCities(false)
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
            const [rows, zonesFromApi] = await Promise.all([fetchDistricts(id), fetchZones(id)])

            setDistrictRows(rows)
            setZonesDetail(zonesFromApi)

            let options = uniqueZonesFromDistricts(rows)
            if (options.length === 0 && zonesFromApi.length > 0) {
                options = zoneOptionsFromZonesApi(zonesFromApi)
            }
            setZoneOptions(options)

            if (rows.length === 0) {
                setBostaError(t('addressModal.noDistricts'))
            } else if (options.length === 0) {
                setBostaError('Could not determine zones for this governorate. Try again later.')
            }
        } catch (err) {
            setBostaError(err?.message || t('addressModal.couldNotLoadLocation'))
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
        if (!session?.userId) {
            toast.error('Please sign in to save an address')
            return
        }
        const firstLine = [street, building && `Bldg ${building}`, floor && `Fl ${floor}`, apartment && `Apt ${apartment}`]
            .filter(Boolean)
            .join(', ')

        const addressPayload = {
            userId: session.userId,
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
        }

        // POST to the API; the thunk pushes the server-shaped record (with its real id)
        // into the list on success. On failure, surface an error and keep the modal open.
        const created = await dispatch(createAddressRemote(addressPayload)).unwrap().catch(() => null)
        if (!created || !created.id) {
            toast.error('Could not save address. Please try again.')
            return
        }
        setShowAddressModal(false)
    }

    return (
        <form
            onSubmit={(e) => toast.promise(handleSubmit(e), { loading: t('addressModal.savingAddress') })}
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
                    {t('addressModal.chooseLocation', { country: DEFAULT_COUNTRY })}
                </p>
                {bostaError && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{bostaError}</p>}

                {session?.userId && session?.name && session?.email ? (
                    <p className="text-xs text-slate-500 rounded border border-slate-100 bg-slate-50/80 px-3 py-2">
                        {t('addressModal.deliveringFor')} <span className="font-medium text-slate-700">{session.name}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-600">{session.email}</span>
                    </p>
                ) : (
                    <>
                        <label className="flex flex-col gap-1 text-sm">
                            {t('addressModal.fullName')}
                            <input value={name} onChange={(e) => setName(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                            {t('addressModal.email')}
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                        </label>
                    </>
                )}
                <label className="flex flex-col gap-1 text-sm">
                    {t('addressModal.phone')}
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    {t('addressModal.cityGovernorate')}
                    <select
                        value={cityId}
                        onChange={onCityChange}
                        className="p-2 border border-slate-200 rounded"
                        required
                        disabled={loadingCities}
                    >
                        <option value="">{loadingCities ? t('addressModal.loadingCities') : t('addressModal.selectCity')}</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    {t('addressModal.zone')}
                    <select value={zoneId} onChange={onZoneChange} className="p-2 border border-slate-200 rounded" required disabled={!cityId || loadingDistricts}>
                        <option value="">{loadingDistricts ? t('addressModal.loadingZones') : t('addressModal.selectZone')}</option>
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
                        <option value="">{t('addressModal.selectDistrict')}</option>
                        {filteredDistricts.map((d) => (
                            <option key={d.districtId} value={d.districtId}>
                                {d.districtName}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    {t('addressModal.streetAddress')}
                    <input value={street} onChange={(e) => setStreet(e.target.value)} className="p-2 border border-slate-200 rounded" required />
                </label>
                <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1 text-sm col-span-1">
                        {t('addressModal.building')}
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
