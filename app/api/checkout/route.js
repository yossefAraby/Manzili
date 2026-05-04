import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function computeTotalCents(items, coupon) {
    let subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (coupon?.discount != null) {
        subtotal -= (coupon.discount / 100) * subtotal;
    }
    const rounded = Math.round(subtotal * 100) / 100;
    return Math.round(rounded * 100);
}

export async function POST(request) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || !secret.startsWith('sk_')) {
        return NextResponse.json(
            {
                error:
                    'Missing STRIPE_SECRET_KEY. Use a test key from Stripe Dashboard → Developers → API keys (starts with sk_test_ for demo mode).',
            },
            { status: 501 }
        );
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { items, coupon } = body;
    if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const currency = (process.env.NEXT_PUBLIC_STRIPE_CURRENCY || 'egp').toLowerCase();
    const unitAmount = computeTotalCents(items, coupon);

    // Stripe minimum charge amounts (smallest currency unit: cents / piastres)
    if (currency === 'usd' && unitAmount < 50) {
        return NextResponse.json(
            { error: 'Order total must be at least $0.50 USD for Stripe test checkout.' },
            { status: 400 }
        );
    }
    if (currency === 'egp' && unitAmount < 100) {
        return NextResponse.json(
            { error: 'Order total must be at least E£1.00 for Stripe checkout.' },
            { status: 400 }
        );
    }

    const baseUrl = (() => {
        if (process.env.NEXT_PUBLIC_APP_URL) {
            return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
        }
        const fromHeader = request.headers.get('origin');
        if (fromHeader) return fromHeader.replace(/\/$/, '');
        const host = request.headers.get('x-forwarded-host');
        const proto = request.headers.get('x-forwarded-proto') || 'http';
        if (host) return `${proto}://${host}`.replace(/\/$/, '');
        return new URL(request.url).origin;
    })();

    const stripe = new Stripe(secret);

    const itemSummary = items.map((i) => `${i.name} × ${i.quantity}`).join('; ');

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency,
                        unit_amount: unitAmount,
                        product_data: {
                            name: 'Manzili order (test mode)',
                            description: itemSummary.slice(0, 500),
                        },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${baseUrl.replace(/\/$/, '')}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl.replace(/\/$/, '')}/cart?payment=canceled`,
            metadata: {
                payment_mode: 'stripe_test',
                item_count: String(items.length),
            },
        });

        return NextResponse.json({ url: session.url, id: session.id });
    } catch (err) {
        console.error('Stripe checkout session error:', err);
        return NextResponse.json(
            { error: err.message || 'Could not start Stripe Checkout' },
            { status: 500 }
        );
    }
}
