'use client'
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import ProductRecommendations from "@/components/ProductRecommendations";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { fetchProductById } from "@/lib/api/products";
import { normalizeProduct } from "@/lib/products/normalizeProduct";
import { useTranslate } from '@/lib/i18n/LocaleContext'

export default function Product() {

    const t = useTranslate()
    const { productId } = useParams();
    const [product, setProduct] = useState();
    const products = useSelector(state => state.product.list);

    useEffect(() => {
        let cancelled = false;
        // Fall back to the product already in the Redux list (dummy/local) so the
        // page renders even before/without the API.
        const localMatch = products.find((p) => p.id === productId);
        if (localMatch && !product) setProduct(localMatch);

        (async () => {
            try {
                const detail = await fetchProductById(productId);
                if (!cancelled && detail) setProduct(normalizeProduct(detail));
            } catch {
                // API failure — keep whatever we resolved from the local list.
                if (!cancelled && localMatch) setProduct(localMatch);
            }
        })();

        scrollTo(0, 0);
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId, products]);

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto">

                {/* Breadcrums */}
                <div className="  text-gray-600 text-sm mt-8 mb-5">
                    {t('navbar.home')} / {t('shop.title')} / {product?.category}
                </div>

                {/* Product Details (the delivery estimate now renders under the price inside it) */}
                {product && (<ProductDetails product={product} />)}

                {/* Description & Reviews */}
                {product && (<ProductDescription product={product} />)}

                {/* AI-powered "Recommended for you" — sits above the layout footer */}
                {product && (<ProductRecommendations product={product} />)}
            </div>
        </div>
    );
}
