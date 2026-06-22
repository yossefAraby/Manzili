// Products (catalog) API calls for the .NET backend + adapters onto the UI shape.
//
// The backend DTOs differ from what the existing components/slice consume, so every
// function here ADAPTS the API response into the UI product shape:
//   { id, name, description, price, mrp, images:[url], category, storeId,
//     store:{id,name,...}, inStock, stock, rating:[], variants:[...], createdAt, ... }
//
// Fail-safe note: these functions THROW on network/API error (ApiError). Callers
// (the slice thunk / pages) are expected to catch and fall back to local/dummy data.

import { apiGet } from './client';

/** Map an API image (either a string or { src, width, height }) to a URL string. */
function imageUrl(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object' && img.src) return img.src;
  return null;
}

/** Map an array of API images to a clean string[] (drops nulls). */
function imageList(images) {
  if (!Array.isArray(images)) return [];
  return images.map(imageUrl).filter(Boolean);
}

/** API category arrives as an array of strings; the UI wants a single string. */
function categoryToString(category) {
  if (Array.isArray(category)) return category[0] || '';
  if (typeof category === 'string') return category;
  return '';
}

/**
 * Resolve the selling price. The list price is the product's normal price; the
 * "offer" is an OPTIONAL sale price. Only treat the offer as the selling price
 * when it's a real discount (positive and below the list price) — otherwise a
 * seller who left the sale field at 0 would show "0 EGP" instead of the price.
 */
function sellingPrice(listRaw, offerRaw) {
  const list = Number(listRaw) || 0;
  const offer = Number(offerRaw);
  return Number.isFinite(offer) && offer > 0 && offer < list ? offer : list;
}

/** Map an API ProductCardDto into the UI product shape. */
export function adaptProductCard(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const main = imageUrl(dto['main image']);
  const images = main ? [main] : imageList(dto.images);
  return {
    id: String(dto.id ?? ''),
    name: dto.name || '',
    description: dto.description || '',
    images,
    price: sellingPrice(dto.price, dto['offer price']),
    mrp: Number(dto.price) || 0,
    category: categoryToString(dto.category),
    storeId: dto.store?.id ? String(dto.store.id) : (dto.storeId ? String(dto.storeId) : null),
    store: dto.store ? { id: String(dto.store.id ?? ''), name: dto.store.name || '', username: dto.store.username || null } : null,
    inStock: dto.inStock !== false,
    stock: dto.inStock === false ? 0 : (dto.stock ?? 10),
    rating: [], // card DTO only carries an aggregate number; UI tolerates an empty array
    variants: [],
    createdAt: dto.createdAt || null,
  };
}

/** Map an API SearchProductDto (images[] strings, category string) into the UI shape. */
export function adaptSearchProduct(dto) {
  if (!dto || typeof dto !== 'object') return null;
  return {
    id: String(dto.id ?? ''),
    name: dto.name || '',
    description: dto.description || '',
    images: imageList(dto.images),
    price: sellingPrice(dto.price, dto.offerPrice),
    mrp: Number(dto.price) || 0,
    category: categoryToString(dto.category),
    storeId: dto.store?.id ? String(dto.store.id) : null,
    store: dto.store ? { id: String(dto.store.id ?? ''), name: dto.store.name || '', username: dto.store.username || null } : null,
    inStock: dto.inStock !== false,
    stock: dto.inStock === false ? 0 : (dto.stock ?? 10),
    rating: [],
    variants: [],
    createdAt: dto.createdAt || null,
  };
}

/** Map an API ReviewDto ({ id, rating, text, userName, date }) into the UI rating shape. */
function adaptReview(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    id: String(r.id ?? ''),
    rating: Number(r.rating) || 0,
    review: r.text || r.review || '',
    user: { name: r.userName || r.user?.name || '', image: r.user?.image || null },
    createdAt: r.date || r.createdAt || null,
  };
}

/**
 * Flatten the API ProductDetailDto variant shape
 *   [{ id, name(type), options:[{ id, value(name), stock, priceDelta, swatch, imageUrl }] }]
 * into the UI's flat variant shape
 *   [{ name, type, swatch, priceDelta, stock, images, image, inStock }].
 *
 * priceDelta is the per-option surcharge added to the product's base price/mrp
 * (Noon-style "+EGP"); ProductDetails sums the selected options' deltas onto the
 * base price. swatch / imageUrl are carried straight through so color swatches
 * render real colors and per-option images can swap the gallery.
 */
function adaptVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return [];
  const flat = [];
  for (const group of variants) {
    const type = group?.name || group?.type || '';
    for (const opt of group?.options || []) {
      const stock = opt?.stock ?? 0;
      const image = opt?.imageUrl || opt?.image || null;
      const priceDelta = Number(opt?.priceDelta) || 0;
      flat.push({
        name: opt?.value || opt?.name || '',
        type,
        swatch: opt?.swatch || null,
        priceDelta,
        // Mirror the delta into `price` too: lib/products/normalizeProduct.js strips
        // unknown fields (incl. priceDelta) but preserves `price`, so this keeps the
        // surcharge alive through Redux/normalization. ProductDetails reads either.
        price: priceDelta,
        stock,
        inStock: stock > 0,
        image,
        images: image ? [image] : [],
      });
    }
  }
  return flat;
}

/** Map an API ProductDetailDto into the UI product shape. */
export function adaptProductDetail(dto) {
  if (!dto || typeof dto !== 'object') return null;
  const reviewItems = (dto.reviews?.items || []).map(adaptReview).filter(Boolean);
  return {
    id: String(dto.id ?? ''),
    name: dto.name || '',
    description: dto.description || '',
    images: imageList(dto.images),
    price: sellingPrice(dto.price, dto.offerPrice),
    mrp: Number(dto.price) || 0,
    category: categoryToString(dto.category),
    size: Array.isArray(dto.size) ? dto.size : [],
    storeId: dto.store?.id ? String(dto.store.id) : null,
    store: dto.store ? { id: String(dto.store.id ?? ''), name: dto.store.name || '', username: dto.store.username || null } : null,
    inStock: dto.inStock !== false,
    stock: dto.stock != null ? Number(dto.stock) : (dto.inStock === false ? 0 : 10),
    rating: reviewItems,
    variants: adaptVariants(dto.variants),
    createdAt: dto.createdAt || null,
  };
}

/**
 * Fetch a page of products. Returns { items, total, page, limit } where items are UI products.
 * Throws ApiError on failure.
 */
export async function fetchProducts({ page = 1, limit = 20, category, sortBy, sortDir } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (category) params.set('category', category);
  if (sortBy) params.set('sortBy', sortBy);
  if (sortDir) params.set('sortDir', sortDir);
  const r = await apiGet(`/products?${params.toString()}`);
  const cards = r?.data?.productCards || r?.data?.ProductCards || [];
  return {
    items: cards.map(adaptProductCard).filter(Boolean),
    total: r?.total ?? cards.length,
    page: r?.page ?? page,
    limit: r?.limit ?? limit,
  };
}

/** Fetch featured products as UI products. Throws on failure. */
export async function fetchFeatured() {
  const r = await apiGet('/products/featured');
  const cards = r?.data?.productCards || r?.data?.ProductCards || [];
  return cards.map(adaptProductCard).filter(Boolean);
}

/** Fetch latest products as UI products. Throws on failure. */
export async function fetchLatest() {
  const r = await apiGet('/products/latest');
  const cards = r?.data?.productCards || r?.data?.ProductCards || [];
  return cards.map(adaptProductCard).filter(Boolean);
}

/** Fetch a single product detail as a UI product. Throws on failure. */
export async function fetchProductById(id) {
  const r = await apiGet(`/products/${encodeURIComponent(id)}`);
  return adaptProductDetail(r?.data);
}

/**
 * Search products. Returns { items, total } where items are UI products.
 * Throws ApiError on failure.
 */
export async function searchProducts(q, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('limit', String(limit));
  const r = await apiGet(`/search?${params.toString()}`);
  const products = r?.data?.products || [];
  return {
    items: products.map(adaptSearchProduct).filter(Boolean),
    total: r?.total ?? products.length,
  };
}
