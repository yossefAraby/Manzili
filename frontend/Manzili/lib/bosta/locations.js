import { bostaFetch } from '@/lib/bosta/client';

export function extractBostaList(response) {
    if (!response) return [];
    if (Array.isArray(response.data)) return response.data;
    // Bosta list endpoints often return { data: { list: [...] } } (e.g. GET /cities).
    if (response.data && Array.isArray(response.data.list)) return response.data.list;
    if (Array.isArray(response)) return response;
    return [];
}

export async function fetchBostaCities() {
    const res = await bostaFetch('/cities', { method: 'GET' });
    return extractBostaList(res);
}

export async function fetchBostaZones(cityId) {
    const res = await bostaFetch(`/cities/${encodeURIComponent(cityId)}/zones`, { method: 'GET' });
    return extractBostaList(res);
}

export async function fetchBostaDistricts(cityId) {
    const res = await bostaFetch(`/cities/${encodeURIComponent(cityId)}/districts`, { method: 'GET' });
    return extractBostaList(res);
}

/** Trim + lowercase for comparing governorate / district labels from Bosta. */
export function normalizeComparableName(s) {
    return String(s || '')
        .trim()
        .toLowerCase();
}

export function normalizeCity(c) {
    const id = c?.cityId || c?._id || c?.id;
    const name = c?.name || c?.city || c?.cityName;
    if (!id || !name) return null;
    return { id: String(id), name: String(name) };
}
