import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const where = storeId ? { storeId } : {};
    try {
        const products = await prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { store: { select: { id: true, name: true, username: true } } },
        });
        return NextResponse.json({ products });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(request) {
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { productId, action } = body || {};
    if (!productId || !action) return NextResponse.json({ error: 'productId and action required' }, { status: 400 });
    try {
        if (action === 'delete') {
            await prisma.product.delete({ where: { id: productId } });
        } else if (action === 'disable') {
            await prisma.product.update({ where: { id: productId }, data: { isDisabled: true } });
        } else if (action === 'enable') {
            await prisma.product.update({ where: { id: productId }, data: { isDisabled: false } });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}
