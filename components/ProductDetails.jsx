"use client";

import { addToCart, makeCartKey } from "@/lib/features/cart/cartSlice";
import { toggleWishlist } from "@/lib/features/wishlist/wishlistSlice";
import {
  SparklesIcon,
  StarIcon,
  TagIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import ReportButton from "@/components/ReportButton";
import { useDispatch, useSelector } from "react-redux";
import { getCurrencySymbol } from "@/lib/currency";
import { useTranslate } from "@/lib/i18n/LocaleContext";

/** sessionStorage key the customize CTA writes to; /custom/custom-form reads + clears it. */
const CUSTOMIZE_SEED_KEY = "manzili_customize_seed_v1";

const isColorType = (t) => /color|colour|colou?r/i.test(t);

const ProductDetails = ({ product }) => {
  const t = useTranslate();
  const productId = product.id;
  const currency = getCurrencySymbol();

  const cart = useSelector((state) => state.cart.cartItems);
  const inWishlist = useSelector((state) =>
    Boolean(state.wishlist.wishlistItems[productId]),
  );
  const dispatch = useDispatch();

  const router = useRouter();

  const [mainImage, setMainImage] = useState(product.images[0]);
  const [selectedVariants, setSelectedVariants] = useState(() => {
    const init = {};
    (product.variants || []).forEach((v) => {
      // Each variant has its own type + name (flat format)
      init[v.type] = v.name;
    });
    return init;
  });
  const cartKey = makeCartKey(productId, selectedVariants);

  // Check whether the currently selected variant(s) are out of stock
  const selectedOutOfStock = (() => {
    if (product.variants && product.variants.length > 0) {
      for (const [type, name] of Object.entries(selectedVariants)) {
        const variant = product.variants.find(
          (v) => v.type === type && v.name === name,
        );
        if (!variant || variant.stock === 0) return true;
      }
      return false;
    }
    return product.stock !== undefined && product.stock === 0;
  })();

  const addToCartHandler = () => {
    // Guard — selected variant is out of stock
    if (selectedOutOfStock) return;
    dispatch(addToCart({ productId, variants: selectedVariants }));
  };

  const customizeThisItem = () => {
    // Stash a lightweight seed object — image data URLs can be large so we
    // only forward the URLs (the /custom/custom-form page will fetch + convert
    // them to its expected {file, preview} shape itself).
    const seed = {
      productId: product.id,
      itemName: product.name,
      description: product.description,
      category: product.category,
      material: product.material || "",
      imageUrls: Array.isArray(product.images)
        ? product.images.slice(0, 5)
        : [],
      store: product.store
        ? {
            id: product.store.id || product.storeId,
            name: product.store.name,
            username: product.store.username,
            logo: product.store.logo,
            description: product.store.description,
          }
        : null,
    };
    try {
      sessionStorage.setItem(CUSTOMIZE_SEED_KEY, JSON.stringify(seed));
    } catch {
      /* ignore quota / private-mode failures — page will just render empty */
    }
    router.push(
      `/custom/custom-form?customize=${encodeURIComponent(product.id)}`,
    );
  };

  const averageRating =
    product.rating.reduce((acc, item) => acc + item.rating, 0) /
    product.rating.length;
  const listPrice = Number(product.mrp);
  const salePrice = Number(product.price);

  // Compute effective price from selected variant
  let effectivePrice = salePrice;
  let effectiveMrp = listPrice;
  for (const [type, name] of Object.entries(selectedVariants)) {
    const variant = (product.variants || []).find(
      (v) => v.type === type && v.name === name,
    );
    if (variant) {
      if (Number(variant.price)) effectivePrice = Number(variant.price);
      if (Number(variant.mrp)) effectiveMrp = Number(variant.mrp);
    }
  }

  const hasListDiscount = effectiveMrp > effectivePrice && effectivePrice > 0;
  const discountPercent = hasListDiscount
    ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100)
    : 0;

  // Group variants by type for display
  const variantsByType = {};
  (product.variants || []).forEach((v) => {
    if (!variantsByType[v.type]) variantsByType[v.type] = [];
    variantsByType[v.type].push(v);
  });

  return (
    <div className="flex max-lg:flex-col gap-12">
      <div className="flex max-sm:flex-col-reverse gap-3">
        <div className="flex sm:flex-col gap-3">
          {product.images.map((image, index) => (
            <div
              key={index}
              onClick={() => setMainImage(product.images[index])}
              className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer"
            >
              <Image
                src={image}
                className="group-hover:scale-103 group-active:scale-95 transition"
                alt=""
                width={45}
                height={45}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg ">
          <Image src={mainImage} alt="" width={250} height={250} />
        </div>
      </div>
      <div className="flex-1">
        <h1 className="text-3xl font-semibold text-slate-800">
          {product.name}
        </h1>
        <div className="flex items-center mt-2">
          {Array(5)
            .fill("")
            .map((_, index) => (
              <StarIcon
                key={index}
                size={14}
                className="text-transparent mt-0.5"
                fill={averageRating >= index + 1 ? "#2582eb" : "#D1D5DB"}
              />
            ))}
          <p className="text-sm ml-3 text-slate-500">
            {product.rating.length} {t('productDetails.reviews')}
          </p>
        </div>
        <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
          <p>
            {currency}
            {effectivePrice}
          </p>
          {hasListDiscount && (
            <p className="text-xl text-slate-500 line-through">
              {currency}
              {effectiveMrp}
            </p>
          )}
        </div>
        {discountPercent > 0 && (
          <div className="flex items-center gap-2 text-slate-500">
            <TagIcon size={14} />
            <p>{t('productDetails.savePercent', { percent: discountPercent })}</p>
          </div>
        )}
        {/* ── Selected variant labels ── */}
        {Object.entries(selectedVariants).filter(([_, v]) => v).length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 mb-1">
            {Object.entries(selectedVariants).filter(([_, v]) => v).map(([type, val]) => (
              <span key={type} className="text-sm text-slate-500">
                {type}: <span className="font-medium text-slate-700">{val}</span>
              </span>
            ))}
          </div>
        )}
        {/* ── Variant selectors ── */}
        {Object.keys(variantsByType).length > 0 && (
          <div className="mt-6 space-y-4">
            {Object.entries(variantsByType).map(([type, options]) => (
              <div key={type}>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  {type}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => {
                    const isColor = isColorType(type);
                    const isSelected = selectedVariants[type] === opt.name;
                    const outOfStock = opt.stock === 0;
                    const lowStock = opt.stock > 0 && opt.stock < 5;
                    return (
                      <div
                        key={opt.name}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <button
                          type="button"
                          onClick={
                            outOfStock
                              ? undefined
                              : () => {
                                  setSelectedVariants((prev) => ({
                                    ...prev,
                                    [type]: opt.name,
                                  }));
                                  if (opt.images?.[0])
                                    setMainImage(opt.images[0]);
                                }
                          }
                          title={isColor ? opt.name : undefined}
                          disabled={outOfStock}
                          className={
                            isColor
                              ? `size-9 rounded-full border-2 transition ${
                                  isSelected
                                    ? "border-slate-800 scale-110"
                                    : "border-slate-200 hover:scale-105"
                                } ${outOfStock ? "opacity-30 cursor-not-allowed" : ""}`
                              : `px-3 py-1.5 text-sm border rounded-lg transition ${
                                  isSelected
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                } ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`
                          }
                          style={
                            isColor
                              ? { backgroundColor: opt.swatch || "#ccc" }
                              : undefined
                          }
                        >
                          {isColor ? (
                            <span className="block size-full rounded-full" />
                          ) : (
                            opt.name
                          )}
                        </button>
                        {outOfStock && (
                          <span className="text-[10px] text-rose-500 whitespace-nowrap">
                            {t('productDetails.outOfStock')}
                          </span>
                        )}
                        {lowStock && !outOfStock && (
                          <span className="text-[10px] text-amber-600 whitespace-nowrap">
                            {t('productDetails.onlyLeft', { stock: opt.stock })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-5 mt-10">
          {cart[cartKey] && (
            <div className="flex flex-col gap-3">
              <p className="text-lg text-slate-800 font-semibold">{t('productDetails.quantity')}</p>
              <Counter productId={productId} cartKey={cartKey} />
            </div>
          )}
          <button
            onClick={() =>
              !cart[cartKey] ? addToCartHandler() : router.push("/cart")
            }
            disabled={selectedOutOfStock}
            className={`px-10 py-3 text-sm font-medium rounded transition ${
              selectedOutOfStock
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-slate-800 text-white hover:bg-slate-900 active:scale-95"
            }`}
          >
            {selectedOutOfStock
              ? t('productDetails.outOfStock')
              : !cart[cartKey]
                ? t('productDetails.addToCart')
                : t('productDetails.viewCart')}
          </button>
          <button
            onClick={() => dispatch(toggleWishlist({ productId }))}
            className="border border-slate-300 text-slate-700 px-6 py-3 text-sm font-medium rounded hover:bg-slate-50 transition"
          >
            {inWishlist ? t('productDetails.wishlisted') : t('productDetails.wishlist')}
          </button>
        </div>

        <hr className="border-gray-300 my-5" />

        {/* Customize-this-item CTA — sends the artisan a private request
                    seeded with this product so the buyer can ask for tweaks. */}
        <div className="flex flex-col gap-2 max-w-md">
          <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <SparklesIcon size={14} className="text-[#2582eb]" />
            {t('productDetails.customizeHint')}
          </p>
          <button
            type="button"
            onClick={customizeThisItem}
            className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#1c355e] hover:bg-[#2582eb] transition-colors duration-200 shadow-sm hover:shadow"
          >
            <WandSparklesIcon
              size={16}
              className="transition-transform duration-200 group-hover:rotate-12"
            />
            <span>{t('productDetails.customizeThis')}</span>
          </button>
        </div>
        <div className="mt-4">
          <ReportButton
            type="NON_HANDMADE_PRODUCT"
            productId={product.id}
            storeId={product.storeId}
            label={t('productDetails.reportThis')}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
