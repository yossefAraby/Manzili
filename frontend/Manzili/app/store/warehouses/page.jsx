'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
    WarehouseIcon,
    PlusIcon,
    XIcon,
    Trash2Icon,
    PencilIcon,
    StarIcon,
    MapPinIcon,
    PhoneIcon,
    UserIcon,
} from 'lucide-react'
import Loading from '@/components/Loading'
import StoreAddressFields, { EMPTY_STORE_ADDRESS } from '@/components/store/StoreAddressFields'
import {
    fetchWarehouses,
    createWarehouse,
    updateWarehouse,
    setDefaultWarehouse,
    deleteWarehouse,
} from '@/lib/api/seller'

/** Compose the single street line Bosta stores from the structured picker fields. */
function composeFirstLine(addr) {
    return [
        addr.street,
        addr.building && `Bldg ${addr.building}`,
        addr.floor && `Fl ${addr.floor}`,
        addr.apartment && `Apt ${addr.apartment}`,
    ]
        .filter(Boolean)
        .join(', ')
}

export default function Warehouses() {
    const [list, setList] = useState([])
    const [loading, setLoading] = useState(true)

    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null) // warehouse being edited, or null for a new one
    const [saving, setSaving] = useState(false)

    // modal form
    const [label, setLabel] = useState('')
    const [contactName, setContactName] = useState('')
    const [phone, setPhone] = useState('')
    const [isDefault, setIsDefault] = useState(false)
    const [address, setAddress] = useState(EMPTY_STORE_ADDRESS)

    const reload = async () => {
        try {
            setList(await fetchWarehouses())
        } catch {
            setList([])
        }
        setLoading(false)
    }
    useEffect(() => {
        reload()
    }, [])

    const openNew = () => {
        setEditing(null)
        setLabel('')
        setContactName('')
        setPhone('')
        setIsDefault(list.length === 0) // first warehouse is forced default
        setAddress(EMPTY_STORE_ADDRESS)
        setModalOpen(true)
    }

    const openEdit = (w) => {
        setEditing(w)
        setLabel(w.label || '')
        setContactName(w.contactName || '')
        setPhone(w.phone || '')
        setIsDefault(w.isDefault)
        // The warehouse keeps a single street line + bosta ids; re-seed the picker
        // from those (building/floor/apt aren't stored separately).
        setAddress({
            ...EMPTY_STORE_ADDRESS,
            street: w.firstLine || '',
            bostaCityId: w.bostaCityId || '',
            bostaCityName: w.city || '',
            bostaZoneId: w.bostaZoneId || '',
            bostaDistrictId: w.bostaDistrictId || '',
        })
        setModalOpen(true)
    }

    const onSave = async (e) => {
        e.preventDefault()
        if (
            !address.bostaCityId ||
            !address.bostaZoneId ||
            !address.bostaDistrictId ||
            !address.street.trim()
        ) {
            toast.error('Pick a city, zone, district and enter a street')
            return
        }
        const payload = {
            label: label.trim(),
            firstLine: composeFirstLine(address),
            city: address.bostaCityName || address.city || '',
            phone: phone.trim(),
            contactName: contactName.trim(),
            bostaCityId: address.bostaCityId,
            bostaZoneId: address.bostaZoneId,
            bostaDistrictId: address.bostaDistrictId,
            isDefault,
        }
        setSaving(true)
        try {
            if (editing) await updateWarehouse(editing.id, payload)
            else await createWarehouse(payload)
            toast.success(editing ? 'Warehouse updated' : 'Warehouse added')
            setModalOpen(false)
            await reload()
        } catch (err) {
            toast.error(err?.message || 'Could not save warehouse')
        } finally {
            setSaving(false)
        }
    }

    const onSetDefault = async (w) => {
        try {
            await setDefaultWarehouse(w.id)
            await reload()
            toast.success('Default warehouse updated')
        } catch (err) {
            toast.error(err?.message || 'Could not set default')
        }
    }

    const onDelete = async (w) => {
        if (!window.confirm(`Delete "${w.label || w.firstLine}"?`)) return
        try {
            await deleteWarehouse(w.id)
            toast.success('Warehouse removed')
            await reload()
        } catch (err) {
            toast.error(err?.message || 'Could not delete warehouse')
        }
    }

    if (loading) return <Loading />

    return (
        <div className="text-slate-500 mb-28 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl">
                        Your <span className="text-slate-800 font-medium">Warehouses</span>
                    </h1>
                    <p className="max-w-xl mt-1 text-sm">
                        Pickup locations Bosta collects your orders from. Your{' '}
                        <span className="text-[#2582eb] font-medium">default</span> warehouse is used
                        for every new order — keep at least one and pick the one closest to your stock.
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="inline-flex items-center gap-2 bg-[#1c355e] hover:bg-[#2582eb] text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-sm hover:shadow-md shrink-0"
                >
                    <PlusIcon size={18} /> Add warehouse
                </button>
            </div>

            {list.length === 0 ? (
                <div className="mt-10 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-slate-300 rounded-2xl py-16 px-6 bg-slate-50">
                    <WarehouseIcon size={36} className="text-slate-300" />
                    <p className="text-slate-600 font-medium">No warehouses yet</p>
                    <p className="text-sm text-slate-400 max-w-sm">
                        Add your first pickup location so Bosta knows where to collect orders. The first
                        one becomes your default automatically.
                    </p>
                    <button
                        onClick={openNew}
                        className="mt-2 inline-flex items-center gap-2 bg-[#1c355e] hover:bg-[#2582eb] text-white px-5 py-2.5 rounded-full font-medium transition"
                    >
                        <PlusIcon size={18} /> Add warehouse
                    </button>
                </div>
            ) : (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {list.map((w) => (
                        <div
                            key={w.id}
                            className={`relative rounded-2xl border p-5 bg-white transition ${
                                w.isDefault ? 'border-[#2582eb] ring-1 ring-[#2582eb]/20' : 'border-slate-200'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <WarehouseIcon size={18} className="text-slate-400 shrink-0" />
                                    <h3 className="font-medium text-slate-800 truncate">
                                        {w.label || 'Warehouse'}
                                    </h3>
                                </div>
                                {w.isDefault && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2582eb] bg-[#2582eb]/10 px-2 py-0.5 rounded-full shrink-0">
                                        <StarIcon size={11} className="fill-[#2582eb]" /> Default
                                    </span>
                                )}
                            </div>

                            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                                <p className="flex items-start gap-2">
                                    <MapPinIcon size={14} className="mt-0.5 text-slate-400 shrink-0" />
                                    <span>
                                        {w.firstLine}
                                        {w.city ? `, ${w.city}` : ''}
                                    </span>
                                </p>
                                {w.contactName && (
                                    <p className="flex items-center gap-2">
                                        <UserIcon size={14} className="text-slate-400 shrink-0" />
                                        {w.contactName}
                                    </p>
                                )}
                                {w.phone && (
                                    <p className="flex items-center gap-2">
                                        <PhoneIcon size={14} className="text-slate-400 shrink-0" />
                                        {w.phone}
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 flex items-center gap-3 text-sm border-t border-slate-100 pt-3">
                                {!w.isDefault && (
                                    <button
                                        onClick={() => onSetDefault(w)}
                                        className="text-[#2582eb] hover:underline font-medium"
                                    >
                                        Set default
                                    </button>
                                )}
                                <button
                                    onClick={() => openEdit(w)}
                                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
                                >
                                    <PencilIcon size={14} /> Edit
                                </button>
                                <button
                                    onClick={() => onDelete(w)}
                                    className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 transition ml-auto"
                                >
                                    <Trash2Icon size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
                    onClick={() => !saving && setModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-base font-semibold text-slate-800">
                                {editing ? 'Edit warehouse' : 'Add warehouse'}
                            </h2>
                            <button
                                onClick={() => !saving && setModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                            >
                                <XIcon size={16} />
                            </button>
                        </div>

                        <form onSubmit={onSave} className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 text-slate-600">
                            <label className="flex flex-col gap-1 text-sm">
                                Warehouse name
                                <input
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="e.g. Main warehouse"
                                    className="p-2 border border-slate-300 rounded outline-slate-400"
                                />
                            </label>

                            <StoreAddressFields value={address} onChange={setAddress} />

                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex flex-col gap-1 text-sm">
                                    Contact name
                                    <input
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className="p-2 border border-slate-300 rounded outline-slate-400"
                                    />
                                </label>
                                <label className="flex flex-col gap-1 text-sm">
                                    Phone
                                    <input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="p-2 border border-slate-300 rounded outline-slate-400"
                                    />
                                </label>
                            </div>

                            <label className="flex items-center gap-2 text-sm mt-1 select-none">
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    disabled={editing ? false : list.length === 0}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    className="accent-[#2582eb] w-4 h-4"
                                />
                                Use as my default pickup warehouse
                                {list.length === 0 && !editing && (
                                    <span className="text-xs text-slate-400">(your first one)</span>
                                )}
                            </label>

                            <div className="flex gap-3 mt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-[#1c355e] hover:bg-[#2582eb] text-white px-6 py-2.5 rounded-full font-medium transition disabled:opacity-60"
                                >
                                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Add warehouse'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    disabled={saving}
                                    className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
