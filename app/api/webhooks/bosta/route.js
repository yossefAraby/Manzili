import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { postWalletTransaction } from '@/lib/server/wallet/wallet';

export const runtime = 'nodejs';

function verifyWebhookAuth(request) {
    const expected = process.env.BOSTA_WEBHOOK_AUTH;
    if (expected && expected.trim()) {
        const got = request.headers.get('authorization');
        return Boolean(got && got.trim() === expected.trim());
    }

    const keyName = process.env.BOSTA_WEBHOOK_AUTH_HEADER_NAME;
    const keyValue = process.env.BOSTA_WEBHOOK_AUTH_HEADER_VALUE;
    if (keyName && keyName.trim() && keyValue && keyValue.trim()) {
        const got = request.headers.get(keyName.trim().toLowerCase());
        return Boolean(got && got.trim() === keyValue.trim());
    }

    return true;
}

function hashPayload(payload) {
    return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
}

function mapStatus(payload) {
    const state = payload?.state || payload?.data?.state || payload?.delivery?.state;
    const value = String(state?.value || state?.name || payload?.status || '').toLowerCase();
    if (value.includes('deliver')) return 'DELIVERED';
    if (value.includes('cancel') || value.includes('terminate')) return 'CANCELED';
    if (value.includes('fail') || value.includes('exception') || value.includes('return')) return 'FAILED';
    if (value.includes('transit') || value.includes('out') || value.includes('route')) return 'IN_TRANSIT';
    if (value.includes('pick')) return 'PICKED_UP';
    return 'UNKNOWN';
}

export async function POST(request) {
    if (!verifyWebhookAuth(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const trackingNumber =
        payload?.trackingNumber ||
        payload?.data?.trackingNumber ||
        payload?.delivery?.trackingNumber ||
        payload?.delivery?.tracking_number;

    if (!trackingNumber) {
        // store anyway for forensics? MVP: reject
        return NextResponse.json({ ok: true, ignored: true });
    }

    const shipment = await prisma.shipment.findFirst({
        where: { trackingNumber: String(trackingNumber) },
    });
    if (!shipment) {
        return NextResponse.json({ ok: true, unknownTracking: true });
    }

    const payloadHash = hashPayload(payload);
    const occurredAtRaw =
        payload?.timestamp ||
        payload?.createdAt ||
        payload?.data?.timestamp ||
        payload?.data?.createdAt;
    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

    await prisma.shipmentEvent
        .create({
            data: {
                shipmentId: shipment.id,
                eventType: 'BOSTA_WEBHOOK',
                occurredAt,
                payloadHash,
                rawPayload: payload,
            },
        })
        .catch(() => null);

    const status = mapStatus(payload);
    await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status },
    });

    if (status === 'DELIVERED') {
        const storeOrder = await prisma.storeOrder.findUnique({
            where: { id: shipment.storeOrderId },
        });
        if (storeOrder) {
            await prisma.storeOrder.update({
                where: { id: storeOrder.id },
                data: { status: 'DELIVERED' },
            });

            if (storeOrder.paymentMethod === 'COD') {
                await postWalletTransaction({
                    storeId: storeOrder.storeId,
                    type: 'COD_PENDING_CREDIT',
                    bucket: 'PENDING',
                    amount: storeOrder.total,
                    idempotencyKey: `cod_delivered:${storeOrder.id}`,
                    references: { storeOrderId: storeOrder.id, shipmentId: shipment.id },
                }).catch(() => null);
            } else if (storeOrder.paymentMethod === 'STRIPE') {
                // Release prepaid funds to available on delivery (MVP)
                await postWalletTransaction({
                    storeId: storeOrder.storeId,
                    type: 'ADJUSTMENT',
                    bucket: 'AVAILABLE',
                    amount: storeOrder.total,
                    idempotencyKey: `prepaid_release:${storeOrder.id}`,
                    references: { storeOrderId: storeOrder.id, shipmentId: shipment.id },
                }).catch(() => null);
            }
        }
    }

    return NextResponse.json({ received: true });
}

