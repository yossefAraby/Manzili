import { NextResponse } from 'next/server';
import { fetchBostaCities, normalizeCity } from '@/lib/bosta/locations';

export async function GET() {
    try {
        const raw = await fetchBostaCities();
        const cities = raw.map(normalizeCity).filter(Boolean);
        return NextResponse.json({ cities });
    } catch (e) {
        console.error('Bosta cities error:', e);
        return NextResponse.json(
            { error: e?.message || 'Could not load cities', cities: [] },
            { status: e?.status >= 400 ? e.status : 502 }
        );
    }
}
