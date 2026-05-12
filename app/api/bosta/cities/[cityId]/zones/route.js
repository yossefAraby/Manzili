import { NextResponse } from 'next/server';
import { fetchBostaZones } from '@/lib/bosta/locations';

export async function GET(_request, { params }) {
    const cityId = params?.cityId;
    if (!cityId) {
        return NextResponse.json({ error: 'cityId required' }, { status: 400 });
    }
    try {
        const raw = await fetchBostaZones(cityId);
        const list = Array.isArray(raw) ? raw : [];
        const zones = list.map((z) => ({
            id: String(z?._id || z?.id || z?.zoneId || ''),
            name: String(z?.name || z?.zoneName || ''),
            districtNames: Array.isArray(z?.districts) ? z.districts : [],
        })).filter((z) => z.id && z.name);
        return NextResponse.json({ zones });
    } catch (e) {
        console.error('Bosta zones error:', e);
        return NextResponse.json(
            { error: e?.message || 'Could not load zones', zones: [] },
            { status: e?.status >= 400 ? e.status : 502 }
        );
    }
}
