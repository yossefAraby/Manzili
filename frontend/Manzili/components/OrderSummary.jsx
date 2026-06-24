import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import AddressModal from './AddressModal';
import { clearCart } from '@/lib/features/cart/cartSlice';
import { clearServerCart } from '@/lib/api/cart';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getCurrencySymbol } from '@/lib/currency';
import { calculateCouponDiscountAmount, normalizeCouponCode, validateCouponForCart } from '@/lib/couponUtils';
import { useTranslate } from '@/lib/i18n/LocaleContext';
import { validateCoupon } from '@/lib/api/seller';
import { createOrder } from '@/lib/api/orders';
import { createCheckoutSession, createKashierPayment, quoteCheckout } from '@/lib/api/checkout';
import { createAddress } from '@/lib/api/addresses';

// Show the Kashier option only when it's been configured/enabled for this deployment.
const KASHIER_ENABLED = process.env.NEXT_PUBLIC_KASHIER_ENABLED === 'true';

/** A server address id is numeric-ish; locally-minted ids look like "addr_…". */
function isServerAddressId(id) {
    if (id == null || id === '') return false;
    return !String(id).startsWith('addr');
}

/** Map cart items (UI products) into the { productId, quantity, variant } the API expects. */
function toApiLineItems(items) {
    return (Array.isArray(items) ? items : []).map((it) => ({
        productId: String(it.id ?? it.productId),
        quantity: Number(it.quantity ?? 1),
        variant: it.variants ?? null,
    }));
}

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
    const [quote, setQuote] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            // Full money breakdown from the backend (same math it charges): goods − discount +
            // the buyer's Bosta shipping share + the Stripe fee. Fails safe to null → "…".
            const couponForQuote = coupon ? { discountAmount: couponDiscountAmount } : null;
            // Pass the chosen address so shipping is priced by the distance to the buyer's city
            // (re-quotes when they switch address). Server-trusted: this is what the card is charged.
            const q = await quoteCheckout({ items, coupon: couponForQuote, paymentMethod, addressId: selectedAddress?.id });
            if (!cancelled) setQuote(q);
        })();
        return () => {
            cancelled = true;
        };
    }, [items, coupon, couponDiscountAmount, paymentMethod, selectedAddress?.id]);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        const normalizedCode = normalizeCouponCode(couponCodeInput);
        if (!normalizedCode) {
            toast.error(t('orderSummary.pleaseEnterCoupon'));
            return;
        }

        // Resolve the coupon via the API (throws / returns null when unknown).
        let matchedCoupon = null;
        try {
            matchedCoupon = await validateCoupon(normalizedCode);
        } catch {
            matchedCoupon = null;
        }
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

        const lineItems = toApiLineItems(items);
        const couponForOrder = coupon ? { ...coupon, discountAmount: couponDiscountAmount } : null;

        // Resolve a REAL server address id. Saved addresses loaded from the API
        // already carry one; a freshly-added address (or any locally-minted id)
        // must be persisted first so the order references a server row.
        let addressId = selectedAddress?.id ?? null;
        if (!isServerAddressId(addressId)) {
            const created = await createAddress(addressPayload);
            if (!created?.id) {
                throw new Error(t('orderSummary.addressNeedsName'));
            }
            addressId = created.id;
        }

        if (paymentMethod === 'COD') {
            await createOrder({
                items: lineItems,
                addressId,
                paymentMethod: 'COD',
                coupon: couponForOrder,
            });
            clearServerCart();
            dispatch(clearCart());
            router.push('/orders');
            return { toastMessage: t('orderSummary.orderPlaced') };
        }

        if (paymentMethod === 'WALLET' || paymentMethod === 'FAWRY') {
            // Kashier Hosted Payment Page (Mobile Wallet or Fawry): backend persists the order +
            // signs the HPP URL; the buyer is redirected to Kashier to pay.
            const kashier = await createKashierPayment({
                items: lineItems,
                addressId,
                coupon: couponForOrder,
                method: paymentMethod === 'FAWRY' ? 'fawry' : 'wallet',
            });
            if (!kashier?.url) {
                throw new Error(t('orderSummary.checkoutUrlMissing'));
            }
            window.location.href = kashier.url;
            return { toastMessage: t('orderSummary.redirectingPayment') };
        }

        // STRIPE: get a Checkout session from the API and redirect to it.
        const checkout = await createCheckoutSession({
            items: lineItems,
            addressId,
            paymentMethod: 'STRIPE',
            coupon: couponForOrder,
        });
        const checkoutUrl = checkout?.url || null;
        if (!checkoutUrl) {
            throw new Error(t('orderSummary.checkoutUrlMissing'));
        }
        window.location.href = checkoutUrl;
        return { toastMessage: t('orderSummary.redirectingStripe') };
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>{t('orderSummary.paymentSummary')}</h2>
            <p className='text-slate-400 text-xs my-4'>{t('orderSummary.paymentMethod')}</p>
            <div className='flex gap-2 items-center'>
                <input type="radio" id="COD" name="payment" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-gray-500' />
                <label htmlFor="COD" className='cursor-pointer'>{t('orderSummary.cod')}</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="STRIPE" name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className='accent-gray-500' />
                <label htmlFor="STRIPE" className='cursor-pointer'>{t('orderSummary.stripe')}</label>
            </div>
            {KASHIER_ENABLED && (
                <div className='flex gap-2 items-center mt-1'>
                    <input type="radio" id="WALLET" name='payment' onChange={() => setPaymentMethod('WALLET')} checked={paymentMethod === 'WALLET'} className='accent-gray-500' />
                    <label htmlFor="WALLET" className='cursor-pointer'>{t('orderSummary.mobileWallet')}</label>
                </div>
            )}
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
                        <p>Delivery</p>
                        <p>Processing fee</p>
                        {coupon && <p>{t('orderSummary.coupon')}</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p>{currency}{formatCartMoney(quote?.subtotal ?? totalPrice)}</p>
                        <p>
                            {quote ? `${currency}${quote.buyerShippingShare.toFixed(2)}` : '…'}
                        </p>
                        <p title="Stripe card processing fee.">
                            {quote ? `${currency}${quote.stripeFee.toFixed(2)}` : '…'}
                        </p>
                        {coupon && <p>{`-${currency}${couponDiscountAmount.toFixed(2)}`}</p>}
                    </div>
                </div>
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
                        quote != null
                            ? quote.total
                            : (coupon ? totalPrice - couponDiscountAmount : totalPrice)
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
