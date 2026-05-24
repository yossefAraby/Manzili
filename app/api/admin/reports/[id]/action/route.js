import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request, { params }) {
    const { id } = params;
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { action, adminNote, disableProduct, disableStore } = body || {};
    const validActions = ['review', 'resolve', 'dismiss'];
    if (!validActions.includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    try {
        const report = await prisma.report.findUnique({ where: { id } });
        if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

        const statusMap = { review: 'REVIEWED', resolve: 'RESOLVED', dismiss: 'DISMISSED' };
        await prisma.report.update({
            where: { id },
            data: {
                status: statusMap[action],
                adminNote: adminNote || report.adminNote,
                resolvedAt: action === 'resolve' ? new Date() : report.resolvedAt,
            },
        });

        // Optional side effects
        if (disableProduct && report.productId) {
            await prisma.product.update({ where: { id: report.productId }, data: { isDisabled: true } });
        }
        if (disableStore && report.storeId) {
            await prisma.store.update({ where: { id: report.storeId }, data: { isActive: false } });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Failed to update report:', err);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }
}
