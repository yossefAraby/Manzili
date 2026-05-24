import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { postWalletTransaction } from '@/lib/server/wallet/wallet';

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { storeId, amount } = body || {};

    if (!storeId) {
        return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    // Fetch current wallet to check available balance
    const wallet = await prisma.sellerWallet.findUnique({
        where: { storeId },
    });

    if (!wallet) {
        return NextResponse.json({ error: 'Wallet not found for this store' }, { status: 404 });
    }

    if (wallet.availableBalance < parsedAmount) {
        return NextResponse.json(
            {
                error: 'Insufficient available balance',
                available: wallet.availableBalance,
                requested: parsedAmount,
            },
            { status: 422 }
        );
    }

    // Record the payout debit as an ADJUSTMENT with a negative amount
    const idempotencyKey = `payout_req:${storeId}:${Date.now()}`;

    await postWalletTransaction({
        storeId,
        type: 'ADJUSTMENT',
        bucket: 'AVAILABLE',
        amount: -parsedAmount, // debit
        currency: wallet.currency || 'EGP',
        idempotencyKey,
    });

    // Return success — admin processes bank transfer manually
    return NextResponse.json({
        ok: true,
        message: 'Payout request recorded. Funds will be transferred within 2-3 business days.',
        requestedAmount: parsedAmount,
        currency: wallet.currency || 'EGP',
    });
}
