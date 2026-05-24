import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending' | 'approved' | 'rejected' | null
    const where = status ? { status } : {};
    try {
        const stores = await prisma.store.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                _count: { select: { Product: true, StoreOrder: true } },
            },
        });
        return NextResponse.json({ stores });
    } catch (err) {
        console.error('Failed to fetch stores:', err);
        return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }
}

export async function POST(request) {
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { storeId, action } = body || {};
    if (!storeId || !action) return NextResponse.json({ error: 'storeId and action required' }, { status: 400 });

    const actionMap = {
        approve:  { status: 'approved', isActive: true },
        reject:   { status: 'rejected', isActive: false },
        disable:  { isActive: false },
        enable:   { isActive: true },
    };
    if (!actionMap[action]) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    try {
        if (action === 'delete') {
            await prisma.store.delete({ where: { id: storeId } });
        } else {
            await prisma.store.update({ where: { id: storeId }, data: actionMap[action] });
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Store action error:', err);
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }
}
