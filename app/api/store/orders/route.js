import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || 'store_1';

    const storeOrders = await prisma.storeOrder.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        include: {
            order: { include: { address: true } },
            orderItems: { include: { product: true } },
            shipment: true,
        },
    });

    return NextResponse.json({ storeOrders });
}

