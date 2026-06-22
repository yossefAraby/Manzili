// Address API calls + adapters for the .NET backend.
//
// The backend exposes:
//   GET    /users/me/addresses        -> { data: [ addressDto ] }
//   POST   /users/me/addresses        -> { data: addressDto }
//   DELETE /users/me/addresses/{id}   -> { data: { message } }
//
// The UI address shape (consumed by the profile page + AddressModal + checkout) is:
//   { id, userId, name, email, street, city, state, zip, country, phone,
//     bostaCityId, bostaZoneId, bostaDistrictId, ...bostaNames, createdAt }
//
// The .NET DTO field names may differ from the UI; adaptAddress() maps them, defaulting any
// missing field sensibly so components never read `undefined`. All calls are auth-only and
// fail safe (empty list / null for guests or on error).

import { apiGet, apiPost, apiDelete } from './client';
import { isAuthed } from './authState';

const DEFAULT_COUNTRY = 'Egypt';
const DEFAULT_COUNTRY_CODE = 'EG';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

/** Map a backend address DTO onto the UI address shape. */
export function adaptAddress(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const id = pick(dto, 'id', 'addressId', 'addressid');
  return {
    id: id != null ? String(id) : null,
    userId: dto.userId != null ? String(dto.userId) : (dto.personid != null ? String(dto.personid) : 'guest'),
    name: pick(dto, 'name', 'fullName', 'recipientName') || '',
    email: pick(dto, 'email') || '',
    street: pick(dto, 'street', 'addressLine', 'firstLine', 'line1') || '',
    city: pick(dto, 'city', 'cityName') || '',
    state: pick(dto, 'state', 'district', 'districtName', 'zone') || '',
    zip: pick(dto, 'zip', 'postalCode', 'zipCode') || '',
    country: pick(dto, 'country') || DEFAULT_COUNTRY,
    countryCode: pick(dto, 'countryCode') || DEFAULT_COUNTRY_CODE,
    phone: pick(dto, 'phone', 'phoneNumber') || '',
    bostaCityId: pick(dto, 'bostaCityId', 'cityId') || '',
    bostaZoneId: pick(dto, 'bostaZoneId', 'zoneId') || '',
    bostaDistrictId: pick(dto, 'bostaDistrictId', 'districtId') || '',
    bostaCityName: pick(dto, 'bostaCityName', 'cityName') || pick(dto, 'city') || '',
    bostaZoneName: pick(dto, 'bostaZoneName', 'zoneName') || '',
    bostaDistrictName: pick(dto, 'bostaDistrictName', 'districtName') || pick(dto, 'state') || '',
    createdAt: pick(dto, 'createdAt', 'created_at') || new Date().toISOString(),
    updatedAt: pick(dto, 'updatedAt', 'updated_at') || new Date().toISOString(),
  };
}

/** Build the request body the API expects from the UI address payload. */
function toApiPayload(p) {
  return {
    name: p.name || '',
    email: p.email || '',
    street: p.street || '',
    city: p.city || '',
    state: p.state || '',
    zip: p.zip || '',
    country: p.country || DEFAULT_COUNTRY,
    phone: p.phone || '',
    bostaCityId: p.bostaCityId || '',
    bostaZoneId: p.bostaZoneId || '',
    bostaDistrictId: p.bostaDistrictId || '',
    bostaCityName: p.bostaCityName || '',
    bostaZoneName: p.bostaZoneName || '',
    bostaDistrictName: p.bostaDistrictName || '',
  };
}

/**
 * Fetch the current user's saved addresses (UI shape). Returns [] for guests or on error.
 */
export async function fetchAddresses() {
  if (!isAuthed()) return [];
  try {
    const res = await apiGet('/users/me/addresses');
    // The endpoint returns { data: { addresses: [...] } }; older code read res.data
    // as the array directly, so the list always hydrated empty and the saved
    // address "disappeared" after a relogin. Accept both shapes defensively.
    const data = res?.data;
    const rows = Array.isArray(data)
      ? data
      : (Array.isArray(data?.addresses) ? data.addresses : []);
    return rows.map(adaptAddress).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Create an address. Returns the created address (UI shape) on success, or null on failure.
 * Returns null for guests so the caller can decide how to handle the not-logged-in case.
 */
export async function createAddress(payload) {
  if (!isAuthed()) return null;
  try {
    const res = await apiPost('/users/me/addresses', toApiPayload(payload || {}));
    const created = adaptAddress(res?.data);
    // If the API returns no body, fall back to echoing the submitted payload so the UI updates.
    return created || adaptAddress({ ...payload, id: payload?.id });
  } catch {
    return null;
  }
}

/** Delete an address by id. Returns true on success, false otherwise. */
export async function deleteAddress(id) {
  if (!isAuthed() || !id) return false;
  try {
    await apiDelete(`/users/me/addresses/${encodeURIComponent(id)}`);
    return true;
  } catch {
    return false;
  }
}
