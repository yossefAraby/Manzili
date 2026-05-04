import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
        return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    try {
        const stripe = new Stripe(secret);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paid = session.payment_status === 'paid';
        return NextResponse.json({
            paid,
            payment_status: session.payment_status,
            amount_total: session.amount_total,
            currency: session.currency,
        });
    } catch (err) {
        console.error('Stripe session retrieve error:', err);
        return NextResponse.json({ error: err.message || 'Invalid session' }, { status: 400 });
    }
}
