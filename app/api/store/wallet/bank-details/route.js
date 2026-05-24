import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
    ensureSellerWallet,
    ensureStripeCustomAccount,
    updateStripeCustomAccountBankDetails,
} from '@/lib/server/wallet/wallet';

/**
 * GET: Retrieve seller's stored bank details (redacted for security)
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
        return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    try {
        const wallet = await prisma.sellerWallet.findUnique({
            where: { storeId },
            select: {
                bankName: true,
                bankAccountHolder: true,
                bankLast4: true,
                stripeAccountId: true,
            },
        });

        if (!wallet) {
            return NextResponse.json({
                bankName: null,
                bankAccountHolder: null,
                bankLast4: null,
                stripeAccountId: null,
            });
        }

        return NextResponse.json(wallet);
    } catch (error) {
        console.error('Failed to retrieve bank details:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve bank details' },
            { status: 500 }
        );
    }
}

/**
 * POST: Update seller's bank account details
 *
 * Request body:
 * {
 *   storeId: string,
 *   bankName: string,
 *   accountHolder: string,
 *   accountNumber: string,
 *   routingNumber?: string,
 *   country?: string (defaults to 'EG')
 * }
 *
 * The bank details are securely sent to Stripe via the API (never shown to seller in Stripe UI).
 * Only redacted versions are stored in our DB.
 */
export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { storeId, bankName, accountHolder, accountNumber, routingNumber, country } = body || {};

    if (!storeId) {
        return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    if (!bankName || !accountHolder || !accountNumber) {
        return NextResponse.json(
            { error: 'Bank name, account holder, and account number are required' },
            { status: 400 }
        );
    }

    try {
        // Ensure seller's wallet exists
        const wallet = await ensureSellerWallet(storeId);

        // Get the store details
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true, name: true, email: true, username: true },
        });

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        // Ensure Stripe Custom Account exists (created on first bank detail submission)
        const { accountId } = await ensureStripeCustomAccount(storeId, store);

        // Update bank details in Stripe and our DB
        await updateStripeCustomAccountBankDetails(storeId, {
            bankName,
            accountHolder,
            accountNumber,
            routingNumber,
            country: country || 'EG',
        });

        return NextResponse.json({
            ok: true,
            message: 'Bank details updated successfully.',
            bankLast4: accountNumber?.slice(-4) || '',
            stripeAccountId: accountId,
        });
    } catch (error) {
        console.error('Bank details update error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to update bank details' },
            { status: 500 }
        );
    }
}
