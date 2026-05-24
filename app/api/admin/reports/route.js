import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // optional filter
    const where = status ? { status } : {};
    try {
        const reports = await prisma.report.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                reporter: { select: { id: true, name: true, email: true, image: true } },
            },
        });
        const pendingCount = await prisma.report.count({ where: { status: 'PENDING' } });
        return NextResponse.json({ reports, pendingCount });
    } catch (err) {
        console.error('Failed to fetch reports:', err);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}
