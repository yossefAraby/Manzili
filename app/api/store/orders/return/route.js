import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleReturn } from '@/lib/server/wallet/wallet';

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { storeOrderId, reason } = body || {};

    if (!storeOrderId) {
        return NextResponse.json({ error: 'storeOrderId is required' }, { status: 400 });
    }

    try {
        // Verify the store order exists
        const storeOrder = await prisma.storeOrder.findUnique({
            where: { id: storeOrderId },
            select: { id: true, storeId: true, total: true, paymentMethod: true, status: true },
        });

        if (!storeOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Only allow returns on delivered orders
        if (storeOrder.status !== 'DELIVERED') {
            return NextResponse.json(
                { error: `Cannot return an order with status: ${storeOrder.status}` },
                { status: 422 }
            );
        }

        // Process the return
        const result = await handleReturn(storeOrderId, reason || 'Customer requested return');

        return NextResponse.json({
            ok: true,
            message: 'Return processed successfully. Your refund will be issued within 5-7 business days.',
            ...result,
        });
    } catch (error) {
        console.error('Return processing error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to process return' },
            { status: 500 }
        );
    }
}
