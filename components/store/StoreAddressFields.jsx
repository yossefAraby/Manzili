'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeComparableName } from '@/lib/bosta/locations'

/**
 * Shared Bosta-driven location picker used by /create-store and /store/settings.
 * Mirrors the city/zone/district + street/building/floor/apartment/zip flow
 * from <AddressModal /> so a store's address validates the same way a cart
 * address does. `value` is a flat object; `onChange` receives the next object.
 *
 * Shape:
 *   { bostaCityId, bostaCityName, bostaZoneId, bostaZoneName,
 *     bostaDistrictId, bostaDistrictName, street, building, floor, apartment, zip }
 */

function uniqueZonesFromDistricts(districtRows) {
    const map = new Map()
    for (const d of districtRows || []) {
        if (d.zoneId && d.zoneName) {
            map.set(d.zoneId, { id: d.zoneId, name: d.zoneName })
        }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

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

export const EMPTY_STORE_ADDRESS = {
    bostaCityId: '',
    bostaCityName: '',
    bostaZoneId: '',
    bostaZoneName: '',
    bostaDistrictId: '',
    bostaDistrictName: '',
    street: '',
    building: '',
    floor: '',
    apartment: '',
    zip: '',
}

/** Single-line summary used wherever a store address needs to render compactly. */
export function formatStoreAddress(addr) {
    if (!addr) return ''
    const street = [
        addr.street,
        addr.building && `Bldg ${addr.building}`,
        addr.floor && `Fl ${addr.floor}`,
        addr.apartment && `Apt ${addr.apartment}`,
    ]
        .filter(Boolean)
        .join(', ')
    const region = [addr.bostaDistrictName, addr.bostaZoneName, addr.bostaCityName]
        .filter(Boolean)
        .join(' · ')
    return [street, region, addr.zip].filter(Boolean).join(' — ')
}

const StoreAddressFields = ({ value, onChange }) => {
    const addr = value || EMPTY_STORE_ADDRESS

    const [cities, setCities] = useState([])
    const [districtRows, setDistrictRows] = useState([])
    const [zonesDetail, setZonesDetail] = useState([])
    const [zoneOptions, setZoneOptions] = useState([])

    const [loadingCities, setLoadingCities] = useState(true)
    const [loadingDistricts, setLoadingDistricts] = useState(false)
    const [bostaError, setBostaError] = useState(null)

    // Track which city's children we've already fetched so an edit-flow prefill
    // populates zone/district dropdowns without forcing the user to reselect.
    const [seededCityId, setSeededCityId] = useState('')

    const patch = (partial) => onChange?.({ ...addr, ...partial })

    const filteredDistricts = useMemo(() => {
        if (!addr.bostaZoneId) return districtRows
        return districtRows.filter((d) => {
            if (d.zoneId && d.zoneId === addr.bostaZoneId) return true
            if (d.zoneId) return false
            const z = zonesDetail.find((x) => x.id === addr.bostaZoneId)
            const names = Array.isArray(z?.districtNames) ? z.districtNames : []
            return names.some(
                (n) => normalizeComparableName(n) === normalizeComparableName(d.districtName)
            )
        })
    }, [districtRows, addr.bostaZoneId, zonesDetail])

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

    const loadCityChildren = useCallback(async (cityId) => {
        setLoadingDistricts(true)
        setBostaError(null)
        try {
            const base = `/api/bosta/cities/${encodeURIComponent(cityId)}`
            const [dRes, zRes] = await Promise.all([
                fetch(`${base}/districts`),
                fetch(`${base}/zones`),
            ])
            const dData = await readJsonSafe(dRes)
            const zData = await readJsonSafe(zRes)
            if (!dRes.ok) throw new Error(dData?.error || 'Could not load districts')

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
    }, [])

    // Auto-load zone/district lists for a prefilled city (edit flow) exactly once.
    useEffect(() => {
        if (!addr.bostaCityId) return
        if (seededCityId === addr.bostaCityId) return
        setSeededCityId(addr.bostaCityId)
        loadCityChildren(addr.bostaCityId)
    }, [addr.bostaCityId, seededCityId, loadCityChildren])

    const onCityChange = async (e) => {
        const id = String(e.target.value || '').trim()
        const c = cities.find((x) => x.id === id)
        patch({
            bostaCityId: id,
            bostaCityName: c?.name || '',
            bostaZoneId: '',
            bostaZoneName: '',
            bostaDistrictId: '',
            bostaDistrictName: '',
        })
        setDistrictRows([])
        setZonesDetail([])
        setZoneOptions([])
        if (!id) return
        setSeededCityId(id)
        await loadCityChildren(id)
    }

    const onZoneChange = (e) => {
        const id = e.target.value
        const z = zoneOptions.find((x) => x.id === id)
        patch({
            bostaZoneId: id,
            bostaZoneName: z?.name || '',
            bostaDistrictId: '',
            bostaDistrictName: '',
        })
    }

    const onDistrictChange = (e) => {
        const id = e.target.value
        const d = filteredDistricts.find((x) => x.districtId === id)
        patch({
            bostaDistrictId: id,
            bostaDistrictName: d?.districtName || '',
        })
    }

    return (
        <div className="flex flex-col gap-3 w-full max-w-lg">
            {bostaError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    {bostaError}
                </p>
            )}

            <label className="flex flex-col gap-1 text-sm">
                City / governorate
                <select
                    value={addr.bostaCityId || ''}
                    onChange={onCityChange}
                    className="p-2 border border-slate-300 rounded outline-slate-400"
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
                <select
                    value={addr.bostaZoneId || ''}
                    onChange={onZoneChange}
                    className="p-2 border border-slate-300 rounded outline-slate-400"
                    required
                    disabled={!addr.bostaCityId || loadingDistricts}
                >
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
                    value={addr.bostaDistrictId || ''}
                    onChange={onDistrictChange}
                    className="p-2 border border-slate-300 rounded outline-slate-400"
                    required
                    disabled={!addr.bostaZoneId}
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
                <input
                    value={addr.street || ''}
                    onChange={(e) => patch({ street: e.target.value })}
                    className="p-2 border border-slate-300 rounded outline-slate-400"
                    required
                />
            </label>

            <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-sm col-span-1">
                    Building
                    <input
                        value={addr.building || ''}
                        onChange={(e) => patch({ building: e.target.value })}
                        className="p-2 border border-slate-300 rounded outline-slate-400"
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm col-span-1">
                    Floor
                    <input
                        value={addr.floor || ''}
                        onChange={(e) => patch({ floor: e.target.value })}
                        className="p-2 border border-slate-300 rounded outline-slate-400"
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm col-span-1">
                    Apartment
                    <input
                        value={addr.apartment || ''}
                        onChange={(e) => patch({ apartment: e.target.value })}
                        className="p-2 border border-slate-300 rounded outline-slate-400"
                    />
                </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
                Postal code (optional)
                <input
                    value={addr.zip || ''}
                    onChange={(e) => patch({ zip: e.target.value })}
                    className="p-2 border border-slate-300 rounded outline-slate-400"
                />
            </label>
        </div>
    )
}

export default StoreAddressFields
