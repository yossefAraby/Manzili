import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
    try {
        const orders = await prisma.storeOrder.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                store: { select: { id: true, name: true, username: true } },
                order: { include: { address: true } },
                orderItems: { include: { product: { select: { name: true } } } },
                shipment: { select: { trackingNumber: true, status: true } },
            },
        });
        return NextResponse.json({ orders });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
