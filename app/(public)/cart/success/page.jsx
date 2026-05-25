'use client';

import { clearCart } from '@/lib/features/cart/cartSlice';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from '@/lib/i18n/LocaleContext'

function SuccessInner() {
    const t = useTranslate();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');
    const mode = searchParams.get('mode');
    const dispatch = useDispatch();
    const router = useRouter();
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (mode === 'local-stripe') {
            dispatch(clearCart());
            setStatus('success');
            return;
        }

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
    }, [sessionId, mode, dispatch]);

    if (status === 'loading') {
        return (
            <div className="min-h-[70vh] mx-6 flex items-center justify-center text-slate-500">
                {t('common.loading')}
            </div>
        );
    }

    if (status === 'missing') {
        return (
            <div className="min-h-[70vh] mx-6 flex flex-col items-center justify-center gap-4 text-slate-600">
                <p>{t('common.error')}</p>
                <Link href="/cart" className="text-[#2582eb] hover:underline">
                    {t('common.back')}
                </Link>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="min-h-[70vh] mx-6 flex flex-col items-center justify-center gap-4 text-slate-600">
                <p>{t('common.error')}</p>
                <button
                    type="button"
                    onClick={() => router.push('/cart')}
                    className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-900"
                >
                    {t('common.back')}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] mx-6 flex flex-col items-center justify-center gap-6 text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-semibold text-slate-800">{t('success.title')}</h1>
            <p className="text-slate-600 text-sm">
                {t('success.message')}
            </p>
            {orderId && (
                <p className="text-xs text-slate-500">
                    {t('orders.orderId', { id: orderId })}
                </p>
            )}
            <div className="flex gap-3 flex-wrap justify-center">
                <Link
                    href="/shop"
                    className="bg-slate-700 text-white px-5 py-2.5 rounded-lg hover:bg-slate-900 transition"
                >
                    {t('success.continueShopping')}
                </Link>
                <Link href="/orders" className="border border-slate-300 px-5 py-2.5 rounded-lg hover:bg-slate-50 transition">
                    {t('success.viewOrder')}
                </Link>
            </div>
        </div>
    );
}

export default function CartSuccessPage() {
    const t = useTranslate();
    return (
        <Suspense
            fallback={
                <div className="min-h-[70vh] mx-6 flex items-center justify-center text-slate-500">
                    {t('common.loading')}
                </div>
            }
        >
            <SuccessInner />
        </Suspense>
    );
}
