import { NextResponse } from 'next/server';
import { estimateCartShippingTotal } from '@/lib/shipping/estimateCart';

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const items = body?.items;
    if (!Array.isArray(items)) {
        return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    const total = estimateCartShippingTotal(items, process.env);
    return NextResponse.json({ estimatedShipping: total, currency: 'EGP' });
}
