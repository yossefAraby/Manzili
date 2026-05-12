import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { ensureShipmentForStoreOrder } from '@/lib/server/shipments/createBostaShipment';
import { postWalletTransaction } from '@/lib/server/wallet/wallet';

export const runtime = 'nodejs';

async function readRawBody(request) {
    const arrayBuffer = await request.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function POST(request) {
    const secret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !webhookSecret) {
        return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 501 });
    }

    const stripe = new Stripe(secret);
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event;
    try {
        const rawBody = await readRawBody(request);
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
        return NextResponse.json({ error: `Webhook signature verification failed` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session?.metadata?.order_id;
        if (orderId) {
            await prisma.$transaction(async (tx) => {
                const order = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        isPaid: true,
                        paymentMethod: 'STRIPE',
                    },
                });

                await tx.storeOrder.updateMany({
                    where: { orderId: order.id },
                    data: {
                        isPaid: true,
                        status: 'ORDER_PLACED',
                    },
                });
            });

            const storeOrders = await prisma.storeOrder.findMany({
                where: { orderId },
                select: { id: true, storeId: true, total: true },
            });

            await Promise.all(
                storeOrders.map((so) =>
                    postWalletTransaction({
                        storeId: so.storeId,
                        type: 'SALE_CREDIT',
                        bucket: 'PENDING',
                        amount: so.total,
                        idempotencyKey: `sale:${so.id}`,
                        references: { orderId, storeOrderId: so.id },
                    }).catch(() => null)
                )
            );
            await Promise.all(storeOrders.map((so) => ensureShipmentForStoreOrder(so.id).catch(() => null)));
        }
    }

    return NextResponse.json({ received: true });
}

