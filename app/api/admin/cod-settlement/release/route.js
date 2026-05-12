import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { postWalletTransaction } from '@/lib/server/wallet/wallet';

function authorized(request) {
    const secret = process.env.ADMIN_ACTIONS_SECRET;
    if (!secret) return false;
    return request.headers.get('x-admin-secret') === secret;
}

export async function POST(request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { storeOrderId } = body || {};
    if (!storeOrderId) {
        return NextResponse.json({ error: 'storeOrderId required' }, { status: 400 });
    }

    const storeOrder = await prisma.storeOrder.findUnique({
        where: { id: storeOrderId },
        select: { id: true, storeId: true, total: true, paymentMethod: true },
    });
    if (!storeOrder) {
        return NextResponse.json({ error: 'StoreOrder not found' }, { status: 404 });
    }
    if (storeOrder.paymentMethod !== 'COD') {
        return NextResponse.json({ error: 'Not a COD StoreOrder' }, { status: 400 });
    }

    await postWalletTransaction({
        storeId: storeOrder.storeId,
        type: 'COD_RELEASE',
        bucket: 'AVAILABLE',
        amount: storeOrder.total,
        idempotencyKey: `cod_release:${storeOrder.id}`,
        references: { storeOrderId: storeOrder.id },
    });

    return NextResponse.json({ ok: true });
}

