import { prisma } from '@/lib/db/prisma';

export const DEMO_BUYER_ID = 'demo_buyer';

export async function ensureDemoBuyer() {
    return prisma.user.upsert({
        where: { id: DEMO_BUYER_ID },
        update: {},
        create: {
            id: DEMO_BUYER_ID,
            name: 'Demo Buyer',
            email: 'demo-buyer@manzili.local',
            image: '/favicon.ico',
            cart: {},
        },
    });
}

export async function ensureStoreOwnerUser(storeId, store = null) {
    const ownerId = `store_owner_${storeId}`;
    const name = store?.user?.name || store?.name || `Store Owner ${storeId}`;
    const email = store?.email || store?.user?.email || `${ownerId}@manzili.local`;
    const image = store?.logo || store?.user?.image || '/favicon.ico';
    return prisma.user.upsert({
        where: { id: ownerId },
        update: { name, email, image },
        create: { id: ownerId, name, email, image, cart: {} },
    });
}

