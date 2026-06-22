'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { getCurrencySymbol } from "@/lib/currency";
import { useTranslate } from '@/lib/i18n/LocaleContext'
import { cancelPendingOrder } from "@/lib/api/checkout";

function formatLineTotal(value) {
    return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default function Cart() {

    const currency = getCurrencySymbol();
    const t = useTranslate();
    
    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);

    const dispatch = useDispatch();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [cartReady, setCartReady] = useState(false);

    useEffect(() => {
        setCartReady(true);
    }, []);

    const createCartArray = () => {
        setTotalPrice(0);
        const cartArray = [];
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(product => product.id === value.productId);
            if (product) {
                cartArray.push({
                    ...product,
                    cartKey: key,
                    quantity: value.quantity,
                    variants: value.variants,
                });
                setTotalPrice(prev => prev + product.price * value.quantity);
            }
        }
        setCartArray(cartArray);
    }

    const handleDeleteItemFromCart = (cartKey) => {
        dispatch(deleteItemFromCart({ key: cartKey }))
    }

    useEffect(() => {
        if (products.length > 0) {
            createCartArray();
        }
    }, [cartItems, products]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'canceled') {
            // Buyer backed out of the payment page → cancel the unpaid order it created, then tell them.
            const orderId = params.get('orderId');
            if (orderId) cancelPendingOrder(orderId);
            toast.error('Payment canceled — your order was not placed.');
            window.history.replaceState({}, '', '/cart');
        }
    }, []);

    if (!cartReady) {
        return (
            <div className="min-h-[50vh] mx-6 flex items-center justify-center text-slate-400 text-sm">
                {t('common.loading')}
            </div>
        );
    }

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800">

            <div className="max-w-7xl mx-auto ">
                {/* Title */}
                <PageTitle heading={t('cart.title')} text="items in your cart" linkText="Add more" />

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">

                    <table className="w-full max-w-4xl text-slate-600 table-auto">
                        <thead>
                            <tr className="max-sm:text-sm">
                                <th className="text-left">Product</th>
                                <th>Quantity</th>
                                <th>Total Price</th>
                                <th className="max-md:hidden">{t('cart.remove')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                cartArray.map((item, index) => (
                                    <tr key={index} className="space-x-2">
                                        <td className="flex gap-3 my-4">
                                            <div className="flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md">
                                                <Image src={item.images[0]} className="h-14 w-auto" alt="" width={45} height={45} />
                                            </div>
                                            <div>
                                                <p className="max-sm:text-sm">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.category}</p>
                                                <p>{currency}{item.price}</p>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Counter productId={item.id} cartKey={item.cartKey} />
                                        </td>
                                        <td className="text-center">{currency}{formatLineTotal(item.price * item.quantity)}</td>
                                        <td className="text-center max-md:hidden">
                                            <button onClick={() => handleDeleteItemFromCart(item.cartKey)} className=" text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all">
                                                <Trash2Icon size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
            <h1 className="text-2xl sm:text-4xl font-semibold">{t('cart.empty')}</h1>
        </div>
    )
}