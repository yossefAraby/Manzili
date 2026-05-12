import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { storeOrderId, status } = body || {};
    if (!storeOrderId || !status) {
        return NextResponse.json({ error: 'storeOrderId and status required' }, { status: 400 });
    }

    const updated = await prisma.storeOrder.update({
        where: { id: storeOrderId },
        data: { status },
    });

    return NextResponse.json({ storeOrder: updated });
}

