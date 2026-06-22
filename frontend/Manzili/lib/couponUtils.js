export const COUPON_SCOPES = {
    GLOBAL: "GLOBAL",
    STORE: "STORE",
    PRODUCTS: "PRODUCTS",
};

export const normalizeCouponCode = (code = "") => code.trim().toUpperCase();

export const isCouponExpired = (coupon) => {
    if (!coupon?.expiresAt) return true;
    return new Date(coupon.expiresAt).getTime() < Date.now();
};

export const getCouponTargetLabel = (coupon) => {
    if (coupon.scope === COUPON_SCOPES.GLOBAL) return "All stores";
    if (coupon.scope === COUPON_SCOPES.STORE) return `Store: ${coupon.storeId}`;
    if (coupon.scope === COUPON_SCOPES.PRODUCTS) {
        return `${coupon.productIds?.length || 0} product(s)`;
    }
    return "-";
};

const getEligibleItemTotal = (coupon, items) => {
    if (coupon.scope === COUPON_SCOPES.GLOBAL) {
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    if (coupon.scope === COUPON_SCOPES.STORE) {
        return items
            .filter((item) => item.storeId === coupon.storeId)
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    if (coupon.scope === COUPON_SCOPES.PRODUCTS) {
        const productIds = new Set(coupon.productIds || []);
        return items
            .filter((item) => productIds.has(item.id))
            .reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    return 0;
};

export const validateCouponForCart = (coupon, items) => {
    if (!coupon) return { valid: false, reason: "Coupon not found" };
    if (isCouponExpired(coupon)) return { valid: false, reason: "Coupon has expired" };
    if ((coupon.maxUsers || 0) <= (coupon.usedCount || 0)) {
        return { valid: false, reason: "Coupon usage limit reached" };
    }

    const eligibleTotal = getEligibleItemTotal(coupon, items);
    if (eligibleTotal <= 0) {
        return { valid: false, reason: "Coupon does not apply to selected cart items" };
    }

    return { valid: true, eligibleTotal };
};

export const calculateCouponDiscountAmount = (coupon, items) => {
    const validation = validateCouponForCart(coupon, items);
    if (!validation.valid) return 0;

    const discount = (coupon.discount / 100) * validation.eligibleTotal;
    return Number(discount.toFixed(2));
};
