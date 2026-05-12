import { NextResponse } from 'next/server';
import { fetchBostaDistricts } from '@/lib/bosta/locations';
import { resolveRouteParams } from '@/lib/server/routeParams';

export async function GET(_request, context) {
    const params = await resolveRouteParams(context?.params);
    const cityId = params?.cityId != null ? String(params.cityId).trim() : '';
    if (!cityId) {
        return NextResponse.json({ error: 'cityId required' }, { status: 400 });
    }
    try {
        const rows = await fetchBostaDistricts(cityId);
        const districts = rows
            .map((d) => {
                const districtId = d?.districtId || d?.districtI || d?._id || d?.id;
                const zoneId = d?.zoneId || d?.zone?._id;
                return {
                    districtId: districtId ? String(districtId) : '',
                    districtName: String(d?.districtName || d?.name || ''),
                    zoneId: zoneId ? String(zoneId) : '',
                    zoneName: String(d?.zoneName || d?.zone?.name || ''),
                };
            })
            .filter((d) => d.districtId && d.districtName);
        return NextResponse.json({ districts });
    } catch (e) {
        console.error('Bosta districts error:', e);
        return NextResponse.json(
            { error: e?.message || 'Could not load districts', districts: [] },
            { status: e?.status >= 400 ? e.status : 502 }
        );
    }
}
