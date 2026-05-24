import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
        return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // Upsert wallet so it always exists for a seller
    const wallet = await prisma.sellerWallet.upsert({
        where: { storeId },
        update: {},
        create: { storeId, currency: 'EGP' },
    });

    // Fetch recent transactions (latest 50)
    const transactions = await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json({ wallet, transactions });
}
