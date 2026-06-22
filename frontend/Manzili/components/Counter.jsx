'use client'
import { addToCart, removeFromCart } from "@/lib/features/cart/cartSlice";
import { useDispatch, useSelector } from "react-redux";

const Counter = ({ productId, cartKey }) => {

    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);
    const dispatch = useDispatch();

    const item = cartItems[cartKey];
    const variants = item?.variants || {};

    // Compute available stock for the current variant selection
    const maxStock = (() => {
        const product = products.find(p => p.id === productId);
        if (!product) return Infinity;
        if (product.variants && product.variants.length > 0) {
            let min = Infinity;
            for (const [type, name] of Object.entries(variants)) {
                const v = product.variants.find(
                    (v) => v.type === type && v.name === name,
                );
                if (!v) return 0;
                min = Math.min(min, v.stock ?? Infinity);
            }
            return min;
        }
        return product.stock ?? Infinity;
    })();

    const atMax = maxStock !== Infinity && (item?.quantity ?? 0) >= maxStock;

    const addToCartHandler = () => {
        if (atMax) return;
        dispatch(addToCart({ productId, variants }));
    };

    const removeFromCartHandler = () => {
        dispatch(removeFromCart({ key: cartKey }));
    };

    return (
        <div className="inline-flex items-center gap-1 sm:gap-3 px-3 py-1 rounded border border-slate-200 max-sm:text-sm text-slate-600">
            <button onClick={removeFromCartHandler} className="p-1 select-none">-</button>
            <p className="p-1">{item?.quantity ?? 0}</p>
            <button
                onClick={atMax ? undefined : addToCartHandler}
                className={`p-1 select-none ${atMax ? "opacity-30 cursor-not-allowed" : ""}`}
                disabled={atMax}
            >
                +
            </button>
        </div>
    );
};

export default Counter
