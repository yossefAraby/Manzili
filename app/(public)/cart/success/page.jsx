'use client';

import { clearCart } from '@/lib/features/cart/cartSlice';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

function SuccessInner() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const dispatch = useDispatch();
    const router = useRouter();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!sessionId) {
            setStatus('missing');
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(
                    `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`
                );
                const data = await res.json();
                if (cancelled) return;
                if (res.ok && data.paid) {
                    dispatch(clearCart());
                    setStatus('success');
                } else {
                    setStatus('failed');
                }
            } catch {
                if (!cancelled) setStatus('failed');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sessionId, dispatch]);

    if (status === 'loading') {
        return (
            <div className="min-h-[70vh] mx-6 flex items-center justify-center text-slate-500">
                Confirming your test payment…
            </div>
        );
    }

    if (status === 'missing') {
        return (
            <div className="min-h-[70vh] mx-6 flex flex-col items-center justify-center gap-4 text-slate-600">
                <p>No checkout session found.</p>
                <Link href="/cart" className="text-[#2582eb] hover:underline">
                    Back to cart
                </Link>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="min-h-[70vh] mx-6 flex flex-col items-center justify-center gap-4 text-slate-600">
                <p>We could not verify this payment.</p>
                <button
                    type="button"
                    onClick={() => router.push('/cart')}
                    className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-900"
                >
                    Return to cart
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] mx-6 flex flex-col items-center justify-center gap-6 text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-semibold text-slate-800">Payment successful (test mode)</h1>
            <p className="text-slate-600 text-sm">
                This was a Stripe test checkout — no real money was charged. Your cart has been
                cleared.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
                <Link
                    href="/shop"
                    className="bg-slate-700 text-white px-5 py-2.5 rounded-lg hover:bg-slate-900 transition"
                >
                    Continue shopping
                </Link>
                <Link href="/orders" className="border border-slate-300 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition">
                    View orders
                </Link>
            </div>
        </div>
    );
}

export default function CartSuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[70vh] mx-6 flex items-center justify-center text-slate-500">
                    Loading…
                </div>
            }
        >
            <SuccessInner />
        </Suspense>
    );
}
