"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import Loading from "@/components/Loading";
import ProductForm from "../../../_components/ProductForm";
import { fetchSellerProduct, updateSellerProduct } from "@/lib/api/seller";
import { updateProduct } from "@/lib/features/product/productSlice";

export default function StoreEditProduct() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const session = useSelector((s) => s.auth.session);

  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Always fetch the seller-scoped detail (rich: description, category, all images,
  // grouped variants) — the cached list DTO is too thin to prefill the form.
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    fetchSellerProduct(id)
      .then((p) => {
        if (cancelled) return;
        if (!p) setNotFound(true);
        else setInitial(p);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateFlow = async (payload) => {
    // ProductForm already uploaded any newly-picked images and built the GROUPED
    // variant payload; persist it, then reflect the saved record in Redux.
    const saved = await updateSellerProduct(id, payload);
    dispatch(updateProduct({ ...saved, id, storeId: session?.storeId }));
    toast.success("Product updated");
    router.push("/store/manage-product");
  };

  if (loading) return <Loading />;
  if (notFound)
    return (
      <div>
        <h1 className="text-2xl text-slate-500 mb-3">Edit Product</h1>
        <p className="text-slate-600">
          This product could not be loaded. It may have been removed.
        </p>
      </div>
    );

  return (
    <div>
      <h1 className="text-2xl text-slate-500">
        Edit <span className="text-slate-800 font-medium">Product</span>
      </h1>
      <ProductForm
        mode="edit"
        initial={initial}
        submitLabel="Save changes"
        onSubmit={(payload) =>
          toast.promise(updateFlow(payload), { loading: "Saving…" })
        }
      />
    </div>
  );
}
