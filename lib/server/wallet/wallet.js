import { prisma } from '@/lib/db/prisma';

export async function ensureSellerWallet(storeId, currency = 'EGP') {
    return prisma.sellerWallet.upsert({
        where: { storeId },
        update: { currency },
        create: { storeId, currency },
    });
}

export async function postWalletTransaction({
    storeId,
    type,
    bucket,
    amount,
    currency = 'EGP',
    idempotencyKey,
    references = {},
}) {
    if (!storeId) throw new Error('storeId required');
    if (!idempotencyKey) throw new Error('idempotencyKey required');
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0) throw new Error('amount must be non-zero');

    return prisma.$transaction(async (tx) => {
        const wallet = await tx.sellerWallet.upsert({
            where: { storeId },
            update: { currency },
            create: { storeId, currency },
        });

        // idempotent insert
        const existing = await tx.walletTransaction.findUnique({
            where: { walletId_idempotencyKey: { walletId: wallet.id, idempotencyKey } },
        });
        if (existing) return { wallet, transaction: existing, applied: false };

        const txRow = await tx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type,
                bucket,
                amount: value,
                currency,
                idempotencyKey,
                orderId: references.orderId ?? null,
                storeOrderId: references.storeOrderId ?? null,
                shipmentId: references.shipmentId ?? null,
            },
        });

        const nextPending = bucket === 'PENDING' ? wallet.pendingBalance + value : wallet.pendingBalance;
        const nextAvailable =
            bucket === 'AVAILABLE' ? wallet.availableBalance + value : wallet.availableBalance;

        const updatedWallet = await tx.sellerWallet.update({
            where: { id: wallet.id },
            data: {
                pendingBalance: nextPending,
                availableBalance: nextAvailable,
            },
        });

        return { wallet: updatedWallet, transaction: txRow, applied: true };
    });
}

