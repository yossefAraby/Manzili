import { prisma } from '@/lib/db/prisma';
import { ensureDemoBuyer, ensureStoreOwnerUser } from '@/lib/server/demoIdentity';
import { round2, safeNumber } from '@/lib/server/money';

function normalizeImage(images) {
    if (!Array.isArray(images) || images.length === 0) return null;
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first?.src && typeof first.src === 'string') return first.src;
    return null;
}

function groupByStore(items) {
    const map = new Map();
    for (const item of items) {
        const storeId = item.storeId || item.store?.id;
        if (!storeId) {
            throw new Error(
                `Cart item "${item.name || item.id || 'unknown'}" has no store — remove it or contact support.`
            );
        }
        const list = map.get(storeId) || [];
        list.push(item);
        map.set(storeId, list);
    }
    return map;
}

export async function createMarketplaceOrder({
    items,
    address,
    paymentMethod,
    coupon,
    stripeSessionId = null,
}) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Cart is empty');
    }
    if (!address?.name || !address?.street) {
        throw new Error('Shipping address required');
    }
    if (paymentMethod !== 'COD' && paymentMethod !== 'STRIPE') {
        throw new Error('Invalid payment method');
    }

    const buyer = await ensureDemoBuyer();

    const cartSubtotal = round2(
        items.reduce((sum, it) => sum + safeNumber(it.price) * safeNumber(it.quantity, 1), 0)
    );
    const discountAmount = round2(safeNumber(coupon?.discountAmount, 0));
    const cartTotal = round2(Math.max(0, cartSubtotal - discountAmount));

    const storeGroups = groupByStore(items);
    if (storeGroups.size === 0) {
        throw new Error('Cart items missing storeId');
    }

    return prisma.$transaction(async (tx) => {
        const dbAddress = await tx.address.create({
            data: {
                userId: buyer.id,
                name: address.name,
                email: address.email || buyer.email,
                street: address.street,
                city: address.city || '',
                state: address.state || '',
                zip: String(address.zip || ''),
                country: address.country || '',
                phone: address.phone || '',
                bostaCityId: address.bostaCityId ?? null,
                bostaZoneId: address.bostaZoneId ?? null,
                bostaDistrictId: address.bostaDistrictId ?? null,
            },
        });

        const order = await tx.order.create({
            data: {
                total: cartTotal,
                status: 'ORDER_PLACED',
                userId: buyer.id,
                addressId: dbAddress.id,
                isPaid: paymentMethod === 'STRIPE' ? false : false,
                paymentMethod,
                isCouponUsed: Boolean(coupon),
                coupon: coupon || {},
            },
        });

        // allocate discount proportionally across stores for accurate per-seller totals
        const storeSubtotals = [];
        for (const [storeId, storeItems] of storeGroups.entries()) {
            const subtotal = round2(
                storeItems.reduce(
                    (sum, it) => sum + safeNumber(it.price) * safeNumber(it.quantity, 1),
                    0
                )
            );
            storeSubtotals.push({ storeId, subtotal, storeItems });
        }
        const subtotalSum = round2(storeSubtotals.reduce((s, x) => s + x.subtotal, 0));

        const storeOrders = [];

        for (const entry of storeSubtotals) {
            const { storeId, subtotal, storeItems } = entry;

            // Ensure store + product existence for FK constraints (demo mode bootstrapping)
            const firstItem = storeItems[0];
            const storeMeta = firstItem?.store || null;
            const owner = await ensureStoreOwnerUser(storeId, storeMeta);

            await tx.store.upsert({
                where: { id: storeId },
                update: {
                    name: storeMeta?.name || `Store ${storeId}`,
                    description: storeMeta?.description || '',
                    username: storeMeta?.username || `store_${storeId}`.replace(/[^a-zA-Z0-9_]/g, ''),
                    address: storeMeta?.address || '',
                    status: storeMeta?.status || 'approved',
                    isActive: storeMeta?.isActive ?? true,
                    logo: storeMeta?.logo?.src && typeof storeMeta.logo.src === 'string' ? storeMeta.logo.src : storeMeta?.logo || '',
                    email: storeMeta?.email || `${storeId}@manzili.local`,
                    contact: storeMeta?.contact || '',
                    userId: owner.id,
                },
                create: {
                    id: storeId,
                    userId: owner.id,
                    name: storeMeta?.name || `Store ${storeId}`,
                    description: storeMeta?.description || '',
                    username: storeMeta?.username || `store_${storeId}`.replace(/[^a-zA-Z0-9_]/g, ''),
                    address: storeMeta?.address || '',
                    status: storeMeta?.status || 'approved',
                    isActive: storeMeta?.isActive ?? true,
                    logo: storeMeta?.logo?.src && typeof storeMeta.logo.src === 'string' ? storeMeta.logo.src : storeMeta?.logo || '',
                    email: storeMeta?.email || `${storeId}@manzili.local`,
                    contact: storeMeta?.contact || '',
                },
            });

            for (const it of storeItems) {
                const productId = it.id;
                if (!productId) continue;
                const productImages = Array.isArray(it.images)
                    ? it.images.map((img) => (typeof img === 'string' ? img : img?.src)).filter(Boolean)
                    : [];
                const shipSize = it.shippingSize || 'MEDIUM';
                const shipBulky = it.shippingBulkyCategory || 'NORMAL';
                await tx.product.upsert({
                    where: { id: productId },
                    update: {
                        name: it.name || 'Unnamed product',
                        description: it.description || '',
                        mrp: safeNumber(it.mrp, safeNumber(it.price, 0)),
                        price: safeNumber(it.price, 0),
                        images: productImages,
                        category: it.category || 'General',
                        inStock: it.inStock ?? true,
                        storeId,
                        shippingSize: shipSize,
                        shippingBulkyCategory: shipBulky,
                    },
                    create: {
                        id: productId,
                        name: it.name || 'Unnamed product',
                        description: it.description || '',
                        mrp: safeNumber(it.mrp, safeNumber(it.price, 0)),
                        price: safeNumber(it.price, 0),
                        images: productImages,
                        category: it.category || 'General',
                        inStock: it.inStock ?? true,
                        storeId,
                        shippingSize: shipSize,
                        shippingBulkyCategory: shipBulky,
                    },
                });
            }

            const allocatedDiscount =
                subtotalSum > 0 ? round2((discountAmount * subtotal) / subtotalSum) : 0;
            const total = round2(Math.max(0, subtotal - allocatedDiscount));

            const storeOrder = await tx.storeOrder.create({
                data: {
                    orderId: order.id,
                    storeId,
                    subtotal,
                    discountTotal: allocatedDiscount,
                    shippingTotal: 0,
                    total,
                    status: paymentMethod === 'STRIPE' ? 'PENDING_PAYMENT' : 'ORDER_PLACED',
                    isPaid: paymentMethod === 'STRIPE' ? false : false,
                    paymentMethod,
                },
            });

            await tx.orderItem.createMany({
                data: storeItems
                    .filter((it) => it.id)
                    .map((it) => ({
                        storeOrderId: storeOrder.id,
                        productId: it.id,
                        quantity: safeNumber(it.quantity, 1),
                        price: safeNumber(it.price, 0),
                        name: it.name || 'Unnamed product',
                        image: normalizeImage(it.images),
                        storeId,
                        shippingSize: it.shippingSize || 'MEDIUM',
                        shippingBulkyCategory: it.shippingBulkyCategory || 'NORMAL',
                    })),
            });

            storeOrders.push(storeOrder);
        }

        return {
            order,
            storeOrders,
            stripeSessionId,
        };
    });
}

