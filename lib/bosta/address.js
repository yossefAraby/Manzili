import { prisma } from '@/lib/db/prisma';
import { bostaFetch } from '@/lib/bosta/client';
import { extractBostaList } from '@/lib/bosta/locations';

async function listCities() {
    return bostaFetch('/cities', { method: 'GET' });
}

async function listDistricts(cityId) {
    return bostaFetch(`/cities/${encodeURIComponent(cityId)}/districts`, { method: 'GET' });
}

function normalizeName(s) {
    return String(s || '').trim().toLowerCase();
}

/** Stable cache key for BostaAddressMapping (UI may send "Egypt" or "EG"). */
function normalizeCountryForMapping(country) {
    const s = String(country || '')
        .trim()
        .toLowerCase();
    if (s === 'egypt' || s === 'eg' || s === '') return 'EG';
    return String(country).trim();
}

export async function resolveBostaDistrict({ country = 'EG', cityName, districtName }) {
    if (!cityName || !districtName) return null;

    const countryKey = normalizeCountryForMapping(country);

    const cached = await prisma.bostaAddressMapping.findFirst({
        where: {
            country: countryKey,
            cityName,
            districtName,
            districtId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
    });
    if (cached) {
        return {
            cityId: cached.cityId,
            zoneId: cached.zoneId,
            districtId: cached.districtId,
        };
    }

    const citiesResp = await listCities();
    const cities = extractBostaList(citiesResp);
    const city = cities.find((c) => normalizeName(c?.name || c?.city) === normalizeName(cityName));
    if (!city?.cityId && !city?._id && !city?.id) {
        await prisma.bostaAddressMapping.create({
            data: {
                country: countryKey,
                cityName,
                districtName,
                cityId: null,
                zoneId: null,
                districtId: null,
            },
        });
        return null;
    }
    const cityId = city.cityId || city._id || city.id;

    const districtsResp = await listDistricts(cityId);
    const districts = extractBostaList(districtsResp);
    // Bosta uses districtName; some payloads use name. YAML typo districtI appears in older docs.
    const district = districts.find(
        (d) =>
            normalizeName(d?.districtName || d?.name) === normalizeName(districtName)
    );

    const zoneId = district?.zoneId || district?.zone?._id || null;
    const districtId =
        district?.districtId || district?.districtI || district?._id || district?.id || null;

    const mappingPayload = {
        cityId: String(cityId),
        zoneId: zoneId ? String(zoneId) : null,
        districtId: districtId ? String(districtId) : null,
    };

    const existingRow = await prisma.bostaAddressMapping.findFirst({
        where: { country: countryKey, cityName, districtName },
        orderBy: { updatedAt: 'desc' },
    });
    if (existingRow) {
        await prisma.bostaAddressMapping.update({
            where: { id: existingRow.id },
            data: mappingPayload,
        });
    } else {
        await prisma.bostaAddressMapping.create({
            data: {
                country: countryKey,
                cityName,
                districtName,
                ...mappingPayload,
            },
        });
    }

    if (!districtId) return null;
    return { cityId: String(cityId), zoneId: zoneId ? String(zoneId) : null, districtId: String(districtId) };
}

