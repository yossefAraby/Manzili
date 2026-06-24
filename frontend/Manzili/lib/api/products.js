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
    // Shipping profile — drives the "Material & Size" line + the size-aware delivery estimate.
    // (Dropping these here was making every product look MEDIUM on the product page.)
    shippingSize: dto.shippingSize || 'MEDIUM',
    shippingBulkyCategory: dto.shippingBulkyCategory || 'NORMAL',
    createdAt: dto.createdAt || null,
  };
}

/**
 * Fetch a page of products. Returns { items, total, page, limit } where items are UI products.
 * Throws ApiError on failure.
 */
export async function fetchProducts({
  page = 1,
  limit = 20,
  category,
  search,
  minPrice,
  maxPrice,
  inStock,
  sortBy,
  sortDir,
} = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  // category may be a single name or a comma-separated list (the backend OR-matches).
  if (category) params.set('category', Array.isArray(category) ? category.join(',') : category);
  if (search) params.set('search', search);
  if (minPrice != null && Number.isFinite(Number(minPrice))) params.set('minPrice', String(minPrice));
  if (maxPrice != null && Number.isFinite(Number(maxPrice))) params.set('maxPrice', String(maxPrice));
  if (inStock === true) params.set('inStock', 'true');
  else if (inStock === false) params.set('inStock', 'false');
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
 * Semantic "describe-it" search → GET /search/semantic. Embeds the query and ranks the catalog
 * by meaning (pgvector); the backend falls back to lexical search when embeddings are unavailable.
 * Returns { items, mode } where items are UI products. Fail-safe to empty so the search UI just
 * shows no results instead of throwing.
 */
// Small in-session cache so re-typing / backspacing the same query doesn't re-embed it.
const _semanticCache = new Map();
export async function searchProductsSemantic(q, limit = 6) {
  const query = String(q ?? '').trim();
  if (query.length < 2) return { items: [], mode: 'empty' };
  const key = `${query.toLowerCase()}|${limit}`;
  if (_semanticCache.has(key)) return _semanticCache.get(key);
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const r = await apiGet(`/search/semantic?${params.toString()}`);
    const products = r?.data?.products || [];
    const out = { items: products.map(adaptSearchProduct).filter(Boolean), mode: r?.mode || 'semantic' };
    _semanticCache.set(key, out);
    if (_semanticCache.size > 50) _semanticCache.delete(_semanticCache.keys().next().value);
    return out;
  } catch {
    return { items: [], mode: 'error' };
  }
}

/**
 * Vector recommendations → GET /search/recommend. ONE engine for both rails: pass seed product
 * id(s) and it returns the products nearest to their average embedding (pgvector; instant, zero
 * tokens). Product page → seed with the viewed product; home "For You" → seed with the shopper's
 * engaged products. Empty seeds → the backend returns popular items. Fail-safe to empty.
 */
export async function fetchRecommended(seedIds, limit = 4) {
  const seeds = (Array.isArray(seedIds) ? seedIds : [seedIds])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean);
  try {
    const params = new URLSearchParams({ seeds: seeds.join(','), limit: String(limit) });
    const r = await apiGet(`/search/recommend?${params.toString()}`);
    const cards = r?.data?.productCards || r?.data?.ProductCards || [];
    return cards.map(adaptProductCard).filter(Boolean);
  } catch {
    return [];
  }
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

/**
 * Search APPROVED stores by name/@username → GET /stores/search. Backs the custom-order private
 * vendor picker directly from the seller table (so it finds sellers even with no listings yet, and
 * never returns hidden stores). Fail-safe to []. Returns [{ id, name, username, description, logo }].
 */
export async function searchStores(q, limit = 20) {
  try {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', String(limit));
    const r = await apiGet(`/stores/search?${params.toString()}`);
    const stores = r?.data?.stores || [];
    return stores.map((s) => ({
      id: String(s.id ?? ''),
      name: s.name || '',
      username: s.username || '',
      description: s.description || '',
      logo: s.logo || null,
    }));
  } catch {
    return [];
  }
}
