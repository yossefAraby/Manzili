export const DEFAULT_SHIPPING_SIZE = 'MEDIUM';
export const DEFAULT_SHIPPING_BULKY = 'NORMAL';

/**
 * Normalize product variants to the flat clone-based format.
 *
 * New flat format (v2):
 *   [{ name, type, swatch, price, mrp, stock, images }]
 *
 * Old nested format (v1):
 *   [{ type, options: [{ name, image, swatch }] }]
 */
function normalizeVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return [];

  // Detect old nested format — first entry has an `options` array
  if (variants[0].options && Array.isArray(variants[0].options)) {
    const flat = [];
    variants.forEach((variant) => {
      (variant.options || []).forEach((opt) => {
        flat.push({
          name: opt.name || '',
          type: variant.type || '',
          swatch: opt.swatch || null,
          price: '',
          mrp: '',
          stock: opt.inStock !== false ? 10 : 0,
          inStock: opt.inStock !== false,
          images: opt.image ? [opt.image] : [],
        });
      });
    });
    return flat;
  }

  // Already flat format — ensure sane defaults
  return variants.map((v) => ({
    name: v.name || '',
    type: v.type || '',
    swatch: v.swatch || null,
    price: v.price ?? '',
    mrp: v.mrp ?? '',
    stock: v.stock ?? (v.inStock !== false ? 10 : 0),
    inStock: v.inStock !== undefined ? v.inStock : true,
    images: Array.isArray(v.images) ? v.images : [],
  }));
}

export function normalizeProduct(product) {
  if (!product || typeof product !== 'object') return product;
  const storeId = product.storeId || product.store?.id;
  return {
    ...product,
    ...(storeId ? { storeId } : {}),
    rating: Array.isArray(product.rating) ? product.rating : [],
    stock: product.stock ?? (product.inStock !== false ? 10 : 0),
    shippingSize: product.shippingSize || DEFAULT_SHIPPING_SIZE,
    shippingBulkyCategory:
      product.shippingBulkyCategory || DEFAULT_SHIPPING_BULKY,
    variants: normalizeVariants(product.variants),
  };
}

export function normalizeProductList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeProduct);
}
