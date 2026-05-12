import { safeNumber } from '@/lib/server/money';

/**
 * Stripe Checkout expects integer smallest-currency units; cart payloads may be loosely typed.
 */
export function computeCheckoutTotalCents(items, coupon) {
    const subtotal = (items || []).reduce((sum, item) => {
        const price = safeNumber(item.price, 0);
        const qty = safeNumber(item.quantity, 1);
        return sum + price * qty;
    }, 0);
    let due = subtotal;
    if (coupon != null && coupon.discountAmount != null) {
        due -= safeNumber(coupon.discountAmount, 0);
    }
    const rounded = Math.round(due * 100) / 100;
    return Math.round(rounded * 100);
}

/** Prisma Json / Stripe metadata: plain serializable coupon snapshot only */
export function sanitizeCouponForOrder(coupon) {
    if (!coupon || typeof coupon !== 'object') return null;
    const discountAmount = coupon.discountAmount != null ? safeNumber(coupon.discountAmount, 0) : undefined;
    const plain = {
        code: typeof coupon.code === 'string' ? coupon.code : String(coupon.code ?? ''),
        discount: coupon.discount != null ? safeNumber(coupon.discount, 0) : undefined,
        scope: coupon.scope,
        storeId: coupon.storeId,
        description: typeof coupon.description === 'string' ? coupon.description.slice(0, 500) : undefined,
    };
    if (discountAmount !== undefined) plain.discountAmount = discountAmount;
    try {
        JSON.stringify(plain);
        return plain;
    } catch {
        return null;
    }
}
