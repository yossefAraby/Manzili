import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
    try {
        const [stores, products, orders, pendingReports, revenue] = await Promise.all([
            prisma.store.count(),
            prisma.product.count(),
            prisma.storeOrder.count({ where: { isPaid: true } }),
            prisma.report.count({ where: { status: 'PENDING' } }),
            prisma.storeOrder.aggregate({
                where: { isPaid: true },
                _sum: { total: true },
            }),
        ]);
        return NextResponse.json({
            stores,
            products,
            orders,
            pendingReports,
            revenue: revenue._sum.total ?? 0,
        });
    } catch (err) {
        console.error('Stats error:', err);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
