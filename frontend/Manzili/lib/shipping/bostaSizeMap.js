/**
 * Internal enums → strings accepted by Bosta create-delivery `specs`.
 * Override per environment with:
 *   BOSTA_SIZE_MAP_SMALL, BOSTA_SIZE_MAP_MEDIUM, BOSTA_SIZE_MAP_LARGE
 *   BOSTA_BULKY_MAP_NORMAL, BOSTA_BULKY_MAP_LIGHT_BULKY, BOSTA_BULKY_MAP_HEAVY_BULKY
 */

const DEFAULT_SIZE = {
    SMALL: 'SMALL',
    MEDIUM: 'MEDIUM',
    LARGE: 'LARGE',
};

const DEFAULT_BULKY = {
    NORMAL: 'Normal',
    LIGHT_BULKY: 'Light Bulky',
    HEAVY_BULKY: 'Heavy Bulky',
};

export function mapShippingSizeToBosta(size, env = process.env) {
    const s = String(size || 'MEDIUM').toUpperCase();
    const key = `BOSTA_SIZE_MAP_${s}`;
    const fromEnv = env[key];
    if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
    return DEFAULT_SIZE[s] || DEFAULT_SIZE.MEDIUM;
}

export function mapBulkyCategoryToBostaPackageType(category, env = process.env) {
    const c = String(category || 'NORMAL').toUpperCase().replace(/\s+/g, '_');
    const key = `BOSTA_BULKY_MAP_${c}`;
    const fromEnv = env[key];
    if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
    return DEFAULT_BULKY[c] || DEFAULT_BULKY.NORMAL;
}

const SIZE_RANK = { SMALL: 1, MEDIUM: 2, LARGE: 3 };
const BULKY_RANK = { NORMAL: 1, LIGHT_BULKY: 2, HEAVY_BULKY: 3 };

export function aggregateShipmentSizing(items) {
    if (!items?.length) {
        return { shippingSize: 'MEDIUM', shippingBulkyCategory: 'NORMAL' };
    }
    let maxSize = 'SMALL';
    let maxBulky = 'NORMAL';
    for (const it of items || []) {
        const sz = String(it.shippingSize || it?.product?.shippingSize || 'MEDIUM').toUpperCase();
        const bk = String(it.shippingBulkyCategory || it?.product?.shippingBulkyCategory || 'NORMAL')
            .toUpperCase()
            .replace(/\s+/g, '_');
        if ((SIZE_RANK[sz] || 0) > (SIZE_RANK[maxSize] || 0)) maxSize = sz;
        if ((BULKY_RANK[bk] || 0) > (BULKY_RANK[maxBulky] || 0)) maxBulky = bk;
    }
    return { shippingSize: maxSize, shippingBulkyCategory: maxBulky };
}
