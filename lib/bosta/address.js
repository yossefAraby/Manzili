import { prisma } from '@/lib/db/prisma';
import { bostaFetch } from '@/lib/bosta/client';

async function listCities() {
    return bostaFetch('/cities', { method: 'GET' });
}

async function listDistricts(cityId) {
    return bostaFetch(`/cities/${encodeURIComponent(cityId)}/districts`, { method: 'GET' });
}

function normalizeName(s) {
    return String(s || '').trim().toLowerCase();
}

export async function resolveBostaDistrict({ country = 'EG', cityName, districtName }) {
    if (!cityName || !districtName) return null;

    const cached = await prisma.bostaAddressMapping.findFirst({
        where: {
            country,
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
    const cities = citiesResp?.data || citiesResp || [];
    const city = cities.find((c) => normalizeName(c?.name || c?.city) === normalizeName(cityName));
    if (!city?.cityId && !city?._id && !city?.id) {
        await prisma.bostaAddressMapping.create({
            data: { country, cityName, districtName, cityId: null, zoneId: null, districtId: null },
        });
        return null;
    }
    const cityId = city.cityId || city._id || city.id;

    const districtsResp = await listDistricts(cityId);
    const districts = districtsResp?.data || districtsResp || [];
    const district = districts.find(
        (d) => normalizeName(d?.name) === normalizeName(districtName)
    );

    const zoneId = district?.zoneId || district?.zone?._id || null;
    const districtId = district?.districtId || district?._id || district?.id || null;

    await prisma.bostaAddressMapping.upsert({
        where: { id: cached?.id || '___never___' },
        update: {},
        create: {
            country,
            cityName,
            districtName,
            cityId: String(cityId),
            zoneId: zoneId ? String(zoneId) : null,
            districtId: districtId ? String(districtId) : null,
        },
    }).catch(async () => {
        // If upsert fails due to fake id, just create a new row.
        await prisma.bostaAddressMapping.create({
            data: {
                country,
                cityName,
                districtName,
                cityId: String(cityId),
                zoneId: zoneId ? String(zoneId) : null,
                districtId: districtId ? String(districtId) : null,
            },
        });
    });

    if (!districtId) return null;
    return { cityId: String(cityId), zoneId: zoneId ? String(zoneId) : null, districtId: String(districtId) };
}

