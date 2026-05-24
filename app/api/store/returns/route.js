import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
        return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    try {
        const returns = await prisma.storeOrder.findMany({
            where: { storeId, status: 'RETURNED' },
            orderBy: { updatedAt: 'desc' },
            include: {
                orderItems: {
                    include: { product: true },
                },
                order: {
                    include: { address: true },
                },
                shipment: {
                    select: { trackingNumber: true },
                },
            },
        });

        const totalRefunded = returns.reduce((sum, r) => sum + Number(r.total), 0);

        return NextResponse.json({ returns, totalRefunded });
    } catch (error) {
        console.error('Failed to fetch returns:', error);
        return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
    }
}
