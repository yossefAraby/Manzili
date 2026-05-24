import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request) {
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { reporterId, type, reason, description, productId, storeId, storeOrderId, customRequestId } = body || {};
    if (!type || !reason || !description) {
        return NextResponse.json({ error: 'type, reason and description are required' }, { status: 400 });
    }
    const validTypes = ['NON_HANDMADE_PRODUCT','SELLER_MISCONDUCT','UNFULFILLED_CUSTOM_REQUEST','GENERAL'];
    if (!validTypes.includes(type)) {
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
    try {
        const report = await prisma.report.create({
            data: {
                reporterId: reporterId || null,
                type,
                reason,
                description,
                productId: productId || null,
                storeId: storeId || null,
                storeOrderId: storeOrderId || null,
                customRequestId: customRequestId || null,
            },
        });
        return NextResponse.json({ ok: true, reportId: report.id });
    } catch (err) {
        console.error('Failed to create report:', err);
        return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }
}
