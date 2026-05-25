import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import AddressModal from './AddressModal';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getCurrencySymbol } from '@/lib/currency';
import { calculateCouponDiscountAmount, normalizeCouponCode, validateCouponForCart } from '@/lib/couponUtils';
import { getCouponByCode } from '@/lib/services/localCouponService';
import { useTranslate } from '@/lib/i18n/LocaleContext';

function formatCartMoney(value) {
    return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function enrichAddressForCheckout(address, session) {
    if (!address) return address;
    const name = String(address.name || '').trim() || String(session?.name || '').trim();
    const email = String(address.email || '').trim() || String(session?.email || '').trim();
    return { ...address, name, email };
}

const OrderSummary = ({ totalPrice, items }) => {

    const t = useTranslate();

    const currency = getCurrencySymbol();

    const router = useRouter();
    const dispatch = useDispatch();

    const addressList = useSelector(state => state.address.list);
    const session = useSelector((state) => state.auth.session);

    const [paymentMethod, setPaymentMethod] = useState('STRIPE');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const couponDiscountAmount = coupon ? calculateCouponDiscountAmount(coupon, items) : 0;
    const [estimatedShipping, setEstimatedShipping] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/shipping/estimate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items }),
                });
                const data = await res.json();
                if (!cancelled && res.ok) setEstimatedShipping(data.estimatedShipping ?? 0);
            } catch {
                if (!cancelled) setEstimatedShipping(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [items]);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        const normalizedCode = normalizeCouponCode(couponCodeInput);
        if (!normalizedCode) {
            toast.error(t('orderSummary.pleaseEnterCoupon'));
            return;
        }

        const matchedCoupon = await getCouponByCode(normalizedCode);
        const validation = validateCouponForCart(matchedCoupon, items);
        if (!validation.valid) {
            toast.error(validation.reason);
            return;
        }

        setCoupon(matchedCoupon);
        toast.success(t('orderSummary.couponApplied'));
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (!selectedAddress) {
            throw new Error(t('orderSummary.selectAddress'));
        }

        const addressPayload = enrichAddressForCheckout(selectedAddress, session);
        if (!String(addressPayload.name || '').trim() || !String(addressPayload.street || '').trim()) {
            throw new Error(t('orderSummary.addressNeedsName'));
        }

        if (paymentMethod === 'COD') {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    address: addressPayload,
                    paymentMethod: 'COD',
                    coupon: coupon ? { ...coupon, discountAmount: couponDiscountAmount } : null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || t('orderSummary.couldNotPlaceOrder'));
            dispatch(clearCart());
            router.push('/orders');
            return { toastMessage: t('orderSummary.orderPlaced') };
        }
        const checkoutRes = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items,
                address: addressPayload,
                coupon: coupon ? { ...coupon, discountAmount: couponDiscountAmount } : null,
            }),
        });
        const checkout = await checkoutRes.json().catch(() => ({}));
        if (!checkoutRes.ok) {
            const detail = [checkout?.error, checkout?.code].filter(Boolean).join(' — ');
            throw new Error(detail || t('orderSummary.couldNotStartCheckout'));
        }
        if (!checkout?.url) {
            throw new Error(t('orderSummary.checkoutUrlMissing'));
        }
        window.location.href = checkout.url;
        return { toastMessage: t('orderSummary.redirectingStripe') };
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>{t('orderSummary.paymentSummary')}</h2>
            <p className='text-slate-400 text-xs my-4'>{t('orderSummary.paymentMethod')}</p>
            <div className='flex gap-2 items-center opacity-45 pointer-events-none select-none' title={t('orderSummary.codNotAvailable')}>
                <input type="radio" id="COD" name="payment" disabled className='accent-gray-400' aria-checked={false} />
                <label htmlFor="COD" className='cursor-not-allowed text-slate-400'>{t('orderSummary.cod')}</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="STRIPE" name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className='accent-gray-500' />
                <label htmlFor="STRIPE" className='cursor-pointer'>{t('orderSummary.stripe')}</label>
            </div>
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>{t('orderSummary.address')}</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p className="text-xs text-slate-600">
                                {selectedAddress.name} · {selectedAddress.bostaDistrictName || selectedAddress.state},{' '}
                                {selectedAddress.bostaCityName || selectedAddress.city}
                                {selectedAddress.zip ? ` · ${selectedAddress.zip}` : ''}
                            </p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">{t('orderSummary.selectAddress')}</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>
                                                    {address.name} — {address.bostaDistrictName || address.state},{' '}
                                                    {address.bostaCityName || address.city}
                                                </option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button
                                className='flex items-center gap-1 text-slate-600 mt-1'
                                onClick={() => {
                                    if (!session?.userId) {
                                        toast.error(t('orderSummary.createAccount'));
                                        router.push('/register');
                                        return;
                                    }
                                    setShowAddressModal(true);
                                }}
                            >{t('orderSummary.addAddress')} <PlusIcon size={18} /></button>
                        </div>
                    )
                }
            </div>
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>{t('orderSummary.subtotal')}</p>
                        <p>{t('orderSummary.shipping')}</p>
                        {coupon && <p>{t('orderSummary.coupon')}</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{formatCartMoney(totalPrice)}</p>
                        <p>
                            {estimatedShipping != null ? (
                                <span title="Based on package size & bulky profile per product">
                                    ~{currency}
                                    {Number(estimatedShipping).toFixed(2)}
                                </span>
                            ) : (
                                '…'
                            )}
                        </p>
                        {coupon && <p>{`-${currency}${couponDiscountAmount.toFixed(2)}`}</p>}
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    {t('orderSummary.estimatedFee')}
                </p>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: t('orderSummary.checkingCoupon') })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder={t('orderSummary.couponCode')} className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>{t('orderSummary.apply')}</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>{t('orderSummary.code')} <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>
            <div className='flex justify-between py-4'>
                <p>{t('orderSummary.total')}</p>
                <p className="font-medium text-right">
                    {currency}
                    {(
                        (coupon ? totalPrice - couponDiscountAmount : totalPrice) +
                        (estimatedShipping != null ? Number(estimatedShipping) : 0)
                    ).toFixed(2)}
                </p>
            </div>
            <button
                onClick={(e) =>
                    toast.promise(handlePlaceOrder(e), {
                        loading: t('orderSummary.placingOrder'),
                        success: (result) => result?.toastMessage || t('orderSummary.orderPlaced'),
                        error: (err) => err?.message || t('orderSummary.couldNotPlaceOrder'),
                    })
                }
                className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all'
            >{t('orderSummary.placeOrder')}</button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary
