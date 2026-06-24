'use client';

import { clearCart } from '@/lib/features/cart/cartSlice';
import { clearServerCart } from '@/lib/api/cart';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from '@/lib/i18n/LocaleContext'

function SuccessInner() {
    const t = useTranslate();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');
    const dispatch = useDispatch();
    const [status, setStatus] = useState('loading');

    // Stripe redirects back here (or to /orders/{id}) after a successful payment;
    // the backend confirms the charge via webhook. The client just clears the cart
    // and shows the confirmation. There is no local session-verification route.
    useEffect(() => {
        clearServerCart();
        dispatch(clearCart());
        setStatus('success');
    }, [dispatch]);

    if (status === 'loading') {
        return (
            <div className="min-h-[70vh] mx-6 flex items-center justify-center text-slate-500">
                {t('common.loading')}
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
