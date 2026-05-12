export const DEFAULT_SHIPPING_SIZE = 'MEDIUM';
export const DEFAULT_SHIPPING_BULKY = 'NORMAL';

export function normalizeProduct(product) {
    if (!product || typeof product !== 'object') return product;
    return {
        ...product,
        shippingSize: product.shippingSize || DEFAULT_SHIPPING_SIZE,
        shippingBulkyCategory: product.shippingBulkyCategory || DEFAULT_SHIPPING_BULKY,
    };
}

export function normalizeProductList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeProduct);
}
