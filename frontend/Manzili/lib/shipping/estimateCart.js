/**
 * Estimated shipping (EGP) for cart display. Tune with env:
 *   ESTIMATE_SHIP_SMALL, ESTIMATE_SHIP_MEDIUM, ESTIMATE_SHIP_LARGE (server)
 *   NEXT_PUBLIC_ESTIMATE_SHIP_* (client build)
 */

function num(env, publicKey, serverKey, fallback) {
    const a = env[publicKey];
    const b = env[serverKey];
    const v = Number(a ?? b ?? fallback);
    return Number.isFinite(v) ? v : fallback;
}

const BULKY_EXTRA = {
    NORMAL: 0,
    LIGHT_BULKY: 15,
    HEAVY_BULKY: 40,
};

export function estimateLineShipping(item, env = process.env) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const size = String(item.shippingSize || 'MEDIUM').toUpperCase();
    const bulky = String(item.shippingBulkyCategory || 'NORMAL').toUpperCase();

    const base = num(
        env,
        `NEXT_PUBLIC_ESTIMATE_SHIP_${size}`,
        `ESTIMATE_SHIP_${size}`,
        size === 'SMALL' ? 35 : size === 'LARGE' ? 75 : 50
    );
    const extra = BULKY_EXTRA[bulky] ?? 0;
    return Math.round((base + extra) * qty * 100) / 100;
}

export function estimateCartShippingTotal(items, env = process.env) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    return Math.round(items.reduce((sum, it) => sum + estimateLineShipping(it, env), 0) * 100) / 100;
}
