import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { createDelivery } from '@/lib/bosta/deliveries';
import { resolveBostaDistrict } from '@/lib/bosta/address';
import {
    aggregateShipmentSizing,
    mapBulkyCategoryToBostaPackageType,
    mapShippingSizeToBosta,
} from '@/lib/shipping/bostaSizeMap';

function featureEnabled() {
    return String(process.env.BOSTA_INTEGRATION_ENABLED || '').toLowerCase() === 'true';
}

function defaultWebhookUrl(baseUrl) {
    if (!baseUrl) return null;
    return `${baseUrl.replace(/\/$/, '')}/api/webhooks/bosta`;
}

function getWebhookHeaderConfig() {
    const legacyValue = process.env.BOSTA_WEBHOOK_AUTH;
    if (legacyValue && legacyValue.trim()) {
        return { Authorization: legacyValue.trim() };
    }

    const headerName = process.env.BOSTA_WEBHOOK_AUTH_HEADER_NAME;
    const headerValue = process.env.BOSTA_WEBHOOK_AUTH_HEADER_VALUE;
    if (headerName && headerName.trim() && headerValue && headerValue.trim()) {
        return { [headerName.trim()]: headerValue.trim() };
    }
    return undefined;
}

export async function ensureShipmentForStoreOrder(storeOrderId) {
    if (!featureEnabled()) return null;

    const storeOrder = await prisma.storeOrder.findUnique({
        where: { id: storeOrderId },
        include: {
            order: { include: { address: true } },
            store: true,
            orderItems: true,
        },
    });
    if (!storeOrder) throw new Error('StoreOrder not found');

    const existing = await prisma.shipment.findUnique({ where: { storeOrderId } });
    if (existing?.trackingNumber) return existing;

    const address = storeOrder.order.address;
    const receiver = {
        firstName: address.name,
        phone: address.phone,
    };

    let districtId = address.bostaDistrictId;
    let zoneId = address.bostaZoneId;
    let cityId = address.bostaCityId;

    if (!districtId && address.city && address.state) {
        const resolved = await resolveBostaDistrict({
            country: address.country || 'EG',
            cityName: address.city,
            districtName: address.state,
        });
        districtId = resolved?.districtId || null;
        zoneId = resolved?.zoneId || null;
        cityId = resolved?.cityId || null;
    }

    if (!districtId) {
        throw new Error('Bosta address not resolved (missing districtId). Add Bosta mapping in address.');
    }

    const pickupLocationId =
        storeOrder.store.bostaPickupLocationId || process.env.BOSTA_BUSINESS_LOCATION_ID_DEFAULT;
    if (!pickupLocationId) {
        throw new Error('Missing BOSTA businessLocationId (set store.bostaPickupLocationId or BOSTA_BUSINESS_LOCATION_ID_DEFAULT)');
    }

    const baseUrl =
        process.env.BOSTA_WEBHOOK_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        'http://localhost:3000';

    const sizing = aggregateShipmentSizing(storeOrder.orderItems || []);
    const bostaSize = mapShippingSizeToBosta(sizing.shippingSize, process.env);
    const bostaPackageType = mapBulkyCategoryToBostaPackageType(sizing.shippingBulkyCategory, process.env);

    const payload = {
        type: 10,
        cod: storeOrder.paymentMethod === 'COD' ? storeOrder.total : 0,
        specs: {
            size: bostaSize,
            packageType: bostaPackageType,
        },
        dropOffAddress: {
            firstLine: address.street,
            city: address.city,
            zoneId,
            districtId,
        },
        receiver,
        businessReference: storeOrder.id,
        businessLocationId: pickupLocationId,
        webhookUrl: defaultWebhookUrl(baseUrl),
        webhookCustomHeaders: getWebhookHeaderConfig(),
    };

    const response = await createDelivery(payload);
    const data = response?.data || response;
    const trackingNumber = data?.trackingNumber || data?.data?.trackingNumber;
    const deliveryId = data?._id || data?.id || data?.data?._id;

    const shipment = await prisma.shipment.upsert({
        where: { storeOrderId },
        update: {
            carrier: 'BOSTA',
            status: 'CREATED',
            trackingNumber: trackingNumber ? String(trackingNumber) : null,
            bostaDeliveryId: deliveryId ? String(deliveryId) : null,
            codAmount: storeOrder.paymentMethod === 'COD' ? storeOrder.total : 0,
            size: sizing.shippingSize,
        },
        create: {
            storeOrderId,
            carrier: 'BOSTA',
            status: 'CREATED',
            trackingNumber: trackingNumber ? String(trackingNumber) : null,
            bostaDeliveryId: deliveryId ? String(deliveryId) : null,
            codAmount: storeOrder.paymentMethod === 'COD' ? storeOrder.total : 0,
            size: sizing.shippingSize,
        },
    });

    const payloadHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(response || {}))
        .digest('hex');

    await prisma.shipmentEvent.create({
        data: {
            shipmentId: shipment.id,
            eventType: 'BOSTA_CREATE_DELIVERY',
            occurredAt: new Date(),
            payloadHash,
            rawPayload: response || {},
        },
    }).catch(() => {});

    return shipment;
}

