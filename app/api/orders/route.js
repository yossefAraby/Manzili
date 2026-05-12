import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createMarketplaceOrder } from '@/lib/server/orders/createOrder';
import { DEMO_BUYER_ID } from '@/lib/server/demoIdentity';
import { ensureShipmentForStoreOrder } from '@/lib/server/shipments/createBostaShipment';

export async function GET() {
    const orders = await prisma.order.findMany({
        where: { userId: DEMO_BUYER_ID },
        orderBy: { createdAt: 'desc' },
        include: {
            address: true,
            storeOrders: {
                include: {
                    orderItems: {
                        include: { product: true },
                    },
                    store: true,
                    shipment: true,
                },
            },
        },
    });
    return NextResponse.json({ orders });
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { items, address, paymentMethod, coupon } = body || {};
    try {
        const result = await createMarketplaceOrder({
            items,
            address,
            paymentMethod,
            coupon,
        });

        if (paymentMethod === 'COD') {
            await Promise.all(
                result.storeOrders.map((so) =>
                    ensureShipmentForStoreOrder(so.id).catch(() => null)
                )
            );
        }
        return NextResponse.json({
            orderId: result.order.id,
            storeOrderIds: result.storeOrders.map((s) => s.id),
        });
    } catch (e) {
        return NextResponse.json({ error: e?.message || 'Could not create order' }, { status: 400 });
    }
}

