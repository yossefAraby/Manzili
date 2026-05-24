import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
    try {
        const requests = await prisma.customRequest.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                store: { select: { id: true, name: true, username: true } },
            },
        });
        return NextResponse.json({ requests });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}
