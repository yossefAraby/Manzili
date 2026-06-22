"use client";

import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { addProduct } from "@/lib/features/product/productSlice";
import { createSellerProduct } from "@/lib/api/seller";
import ProductForm from "../_components/ProductForm";

export default function StoreAddProduct() {
  const dispatch = useDispatch();
  const session = useSelector((s) => s.auth.session);

  // ProductForm already uploaded any picked images → URLs and built the GROUPED
  // variant payload; we just attach the store id and persist it.
  const createFlow = async (payload) => {
    if (!session?.storeId) {
      toast.error(
        "Your account has no store linked. Create a store from the seller dashboard first.",
      );
      throw new Error("No store linked");
    }
    const product = { ...payload, storeId: session.storeId };
    const created = await createSellerProduct(product);
    // Reflect it in the live Redux catalog so the Manage Product page shows it
    // immediately without a round-trip.
    dispatch(addProduct({ ...created, storeId: session.storeId }));
    toast.success("Product added");
  };

  return (
    <div>
      <h1 className="text-2xl text-slate-500">
        Add New <span className="text-slate-800 font-medium">Product</span>
      </h1>
      <ProductForm
        mode="create"
        submitLabel="Add product"
        onSubmit={(payload) =>
          toast.promise(createFlow(payload), { loading: "Adding product…" })
        }
      />
    </div>
  );
}
