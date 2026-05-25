"use client";

import { assets } from "@/assets/assets";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { addProduct } from "@/lib/features/product/productSlice";
import { makeEntityId } from "@/lib/storage/localStorageEnvelope";
import { getCurrencySymbol } from "@/lib/currency";

export default function StoreAddProduct() {
  const dispatch = useDispatch();
  const session = useSelector((s) => s.auth.session);

  const categories = [
    "Woodwork",
    "Woodworking",
    "Accessories",
    "Stationery",
    "Food & Snacks",
    "fragrances",
    "Textiles",
    "Porcelain",
  ];

  const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [productInfo, setProductInfo] = useState({
    name: "",
    description: "",
    material: "",
    mrp: 0,
    price: 0,
    category: "",
    shippingSize: "MEDIUM",
    shippingBulkyCategory: "NORMAL",
  });
  const [loading, setLoading] = useState(false);

  const [variantGroups, setVariantGroups] = useState([]); // [{id, type, options: [{id, name, swatch, price, mrp, stock, image}]}]
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupType, setNewGroupType] = useState("");
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [newOptionForm, setNewOptionForm] = useState({
    name: "",
    swatch: "#cccccc",
    price: "",
    mrp: "",
    stock: "",
    image: null,
  });

  const isColorType = (type) => /color/i.test(type);

  const resetOptionForm = () => {
    setNewOptionForm({
      name: "",
      swatch: "#cccccc",
      price: "",
      mrp: "",
      stock: "",
      image: null,
    });
  };

  const addVariantGroup = () => {
    const type = newGroupType.trim();
    if (!type) {
      toast.error("Variant group type is required");
      return;
    }
    setVariantGroups((prev) => [
      ...prev,
      { id: Date.now(), type, options: [] },
    ]);
    setNewGroupType("");
    setShowGroupForm(false);
  };

  const removeVariantGroup = (id) => {
    setVariantGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const addOptionToGroup = (groupId) => {
    const name = newOptionForm.name.trim();
    if (!name) {
      toast.error("Option name is required");
      return;
    }
    const group = variantGroups.find((g) => g.id === groupId);
    if (!group) return;
    if (group.options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Option already exists in this group");
      return;
    }
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: [
                ...g.options,
                {
                  id: Date.now(),
                  name,
                  swatch: isColorType(group.type)
                    ? newOptionForm.swatch
                    : "",
                  price: Number(newOptionForm.price) || 0,
                  mrp: Number(newOptionForm.mrp) || 0,
                  stock: Number(newOptionForm.stock) || 0,
                  image: newOptionForm.image,
                },
              ],
            }
          : g,
      ),
    );
    resetOptionForm();
    setActiveGroupId(null);
  };

  const removeOptionFromGroup = (groupId, optionId) => {
    setVariantGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g,
      ),
    );
  };

  const updateOptionForm = (field, value) => {
    setNewOptionForm((prev) => ({ ...prev, [field]: value }));
  };

  const onChangeHandler = (e) => {
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value });
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!session?.storeId) {
      toast.error(
        "Your account has no store linked. Create a store from the seller dashboard first.",
      );
      return;
    }
    setLoading(true);
    try {
      const imageUrls = [];
      for (const key of Object.keys(images)) {
        const f = images[key];
        if (f) imageUrls.push(await fileToDataUrl(f));
      }
      const uploadFallback =
        typeof assets.upload_area === "string"
          ? assets.upload_area
          : assets.upload_area?.src;
      const primary = imageUrls[0] || uploadFallback || "/favicon.ico";

      // Flatten variant groups → flat array
      const processedVariants = [];
      for (const group of variantGroups) {
        for (const opt of group.options) {
          processedVariants.push({
            name: opt.name,
            type: group.type,
            swatch: opt.swatch || null,
            price: Number(opt.price) || Number(productInfo.price) || 0,
            mrp: Number(opt.mrp) || Number(productInfo.mrp) || 0,
            stock: Number(opt.stock) || 0,
            images:
              opt.image instanceof File
                ? [await fileToDataUrl(opt.image)]
                : [],
          });
        }
      }

      const product = {
        id: makeEntityId("prod"),
        name: productInfo.name,
        description: productInfo.description,
        material: productInfo.material.trim(),
        mrp: Number(productInfo.mrp) || 0,
        price: Number(productInfo.price) || 0,
        images: imageUrls.length ? imageUrls : [primary],
        category: productInfo.category,
        storeId: session.storeId,
        inStock: true,
        variants: processedVariants.length > 0 ? processedVariants : [],
        shippingSize: productInfo.shippingSize,
        shippingBulkyCategory: productInfo.shippingBulkyCategory,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch(addProduct(product));
      toast.success("Product added (saved in this browser)");
      setProductInfo({
        name: "",
        description: "",
        material: "",
        mrp: 0,
        price: 0,
        category: "",
        shippingSize: "MEDIUM",
        shippingBulkyCategory: "NORMAL",
      });
      setImages({ 1: null, 2: null, 3: null, 4: null });
      setVariantGroups([]);
      setShowGroupForm(false);
      setNewGroupType("");
      setActiveGroupId(null);
      resetOptionForm();
    } catch (err) {
      toast.error(err?.message || "Could not add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) =>
        toast.promise(onSubmitHandler(e), { loading: "Adding product…" })
      }
      className="text-slate-500 mb-28"
    >
      <h1 className="text-2xl">
        Add New <span className="text-slate-800 font-medium">Product</span>
      </h1>
      <p className="mt-7">Product images</p>

      <div className="flex gap-3 mt-4">
        {Object.keys(images).map((key) => (
          <label key={key} htmlFor={`images${key}`}>
            <Image
              width={300}
              height={300}
              className="h-15 w-auto border border-slate-200 rounded cursor-pointer"
              src={
                images[key]
                  ? URL.createObjectURL(images[key])
                  : typeof assets.upload_area === "string"
                    ? assets.upload_area
                    : assets.upload_area?.src
              }
              alt=""
            />
            <input
              type="file"
              accept="image/*"
              id={`images${key}`}
              onChange={(e) =>
                setImages({ ...images, [key]: e.target.files?.[0] || null })
              }
              hidden
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-2 my-6 ">
        Name
        <input
          type="text"
          name="name"
          onChange={onChangeHandler}
          value={productInfo.name}
          placeholder="Product name"
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
          required
        />
      </label>

      <label className="flex flex-col gap-2 my-6 ">
        Description
        <textarea
          name="description"
          onChange={onChangeHandler}
          value={productInfo.description}
          placeholder="Description"
          rows={5}
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded resize-none"
          required
        />
      </label>

      <label className="flex flex-col gap-2 my-6 ">
        Material
        <input
          type="text"
          name="material"
          onChange={onChangeHandler}
          value={productInfo.material}
          placeholder="e.g. Oak wood, cotton, ceramic"
          className="w-full max-w-sm p-2 px-4 outline-none border border-slate-200 rounded"
        />
        <span className="text-xs text-slate-400">
          Shown on the product page under the description.
        </span>
      </label>

      <div className="flex gap-5 flex-wrap">
        <label className="flex flex-col gap-2 ">
          List price (EGP)
          <input
            type="number"
            name="mrp"
            onChange={onChangeHandler}
            value={productInfo.mrp}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            required
            min={0}
            step="0.01"
          />
        </label>
        <label className="flex flex-col gap-2 ">
          Offer price (EGP)
          <input
            type="number"
            name="price"
            onChange={onChangeHandler}
            value={productInfo.price}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            required
            min={0}
            step="0.01"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl my-6">
        <label className="flex flex-col gap-2 text-sm">
          Package size (internal)
          <select
            name="shippingSize"
            value={productInfo.shippingSize}
            onChange={onChangeHandler}
            className="p-2 border border-slate-200 rounded"
          >
            <option value="SMALL">Small</option>
            <option value="MEDIUM">Medium</option>
            <option value="LARGE">Large</option>
          </select>
          <span className="text-xs text-slate-400">
            Maps to Bosta via BOSTA_SIZE_MAP_* env vars.
          </span>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Bulky / type profile
          <select
            name="shippingBulkyCategory"
            value={productInfo.shippingBulkyCategory}
            onChange={onChangeHandler}
            className="p-2 border border-slate-200 rounded"
          >
            <option value="NORMAL">Normal</option>
            <option value="LIGHT_BULKY">Light bulky</option>
            <option value="HEAVY_BULKY">Heavy bulky</option>
          </select>
          <span className="text-xs text-slate-400">
            Maps to Bosta package type via BOSTA_BULKY_MAP_*.
          </span>
        </label>
      </div>

      <select
        onChange={(e) =>
          setProductInfo({ ...productInfo, category: e.target.value })
        }
        value={productInfo.category}
        className="w-full max-w-sm p-2 px-4 my-2 outline-none border border-slate-200 rounded"
        required
      >
        <option value="">Select a category</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <br />

      {/* ── Variants ── */}
      <div className="my-6 max-w-lg">
        <p className="text-slate-600 font-medium mb-1">Product Variants</p>
        <p className="text-xs text-slate-400 mb-3">
          Each variant is a clone of the main product with its own price, stock
          and image. Add color, size or other variations.
        </p>

        {/* Existing groups */}
        {variantGroups.map((group) => (
          <div
            key={group.id}
            className="mb-4 border border-slate-200 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">
                {group.type}
              </p>
              <button
                type="button"
                onClick={() => removeVariantGroup(group.id)}
                className="text-xs text-rose-500 hover:text-rose-700"
              >
                Remove Group
              </button>
            </div>

            {/* Options list */}
            {group.options.length === 0 && (
              <p className="text-xs text-slate-400 mb-2">No options yet.</p>
            )}
            <div className="space-y-2">
              {group.options.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center gap-2 text-sm bg-slate-50 rounded px-2 py-1.5"
                >
                  {isColorType(group.type) && opt.swatch && (
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-slate-300 shrink-0"
                      style={{ backgroundColor: opt.swatch }}
                    />
                  )}
                  <span className="font-medium text-slate-700 min-w-0">
                    {opt.name}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {getCurrencySymbol()}
                    {opt.price || productInfo.price}
                  </span>
                  <span className="text-xs text-slate-400">
                    Stock: {opt.stock || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOptionFromGroup(group.id, opt.id)}
                    className="text-xs text-rose-400 hover:text-rose-600 ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add option button or form */}
            {activeGroupId === group.id ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <input
                    type="text"
                    value={newOptionForm.name}
                    onChange={(e) =>
                      updateOptionForm("name", e.target.value)
                    }
                    placeholder="Name (e.g. Red)"
                    className="col-span-2 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
                  />
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      value={newOptionForm.price}
                      onChange={(e) =>
                        updateOptionForm("price", e.target.value)
                      }
                      placeholder={String(productInfo.price || "0")}
                      className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      MRP
                    </label>
                    <input
                      type="number"
                      value={newOptionForm.mrp}
                      onChange={(e) =>
                        updateOptionForm("mrp", e.target.value)
                      }
                      placeholder={String(productInfo.mrp || "0")}
                      className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Stock *
                    </label>
                    <input
                      type="number"
                      value={newOptionForm.stock}
                      onChange={(e) =>
                        updateOptionForm("stock", e.target.value)
                      }
                      placeholder="0"
                      required
                      min={0}
                      className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
                    />
                  </div>
                  <div>
                    {isColorType(group.type) && (
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Swatch:</span>
                        <input
                          type="color"
                          value={newOptionForm.swatch}
                          onChange={(e) =>
                            updateOptionForm("swatch", e.target.value)
                          }
                          className="w-8 h-8 p-0.5 border border-slate-300 rounded cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                </div>
                {/* Image */}
                <div className="mt-2">
                  <label className="text-xs text-slate-400 block mb-1">
                    Image (optional)
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-[#2582eb] cursor-pointer hover:underline">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateOptionForm(
                          "image",
                          e.target.files?.[0] || null,
                        )
                      }
                      className="hidden"
                    />
                    {newOptionForm.image
                      ? newOptionForm.image.name
                      : "Upload image"}
                  </label>
                  {newOptionForm.image && (
                    <Image
                      width={60}
                      height={60}
                      className="h-15 w-auto mt-2 rounded border border-slate-200"
                      src={URL.createObjectURL(newOptionForm.image)}
                      alt=""
                    />
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => addOptionToGroup(group.id)}
                    className="text-sm bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-900 transition"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetOptionForm();
                      setActiveGroupId(null);
                    }}
                    className="text-sm border border-slate-200 text-slate-500 px-4 py-2 rounded hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetOptionForm();
                  setActiveGroupId(group.id);
                }}
                className="mt-2 text-sm text-[#2582eb] hover:underline"
              >
                + Add option
              </button>
            )}
          </div>
        ))}

        {/* Add group form */}
        {showGroupForm ? (
          <div className="border border-slate-200 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-slate-700 mb-3">
              New Variant Group
            </p>
            <div className="flex gap-2 mb-3">
              <select
                value={newGroupType}
                onChange={(e) => setNewGroupType(e.target.value)}
                className="flex-1 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400 bg-white"
              >
                <option value="">Select type…</option>
                <option value="Color">Color</option>
                <option value="Size">Size</option>
                <option value="Material">Material</option>
                <option value="Style">Style</option>
                <option value="Flavor">Flavor</option>
              </select>
              <input
                type="text"
                value={newGroupType}
                onChange={(e) => setNewGroupType(e.target.value)}
                placeholder="Or type custom…"
                className="flex-1 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addVariantGroup}
                className="text-sm bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-900 transition"
              >
                Create Group
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGroupForm(false);
                  setNewGroupType("");
                }}
                className="text-sm border border-slate-200 text-slate-500 px-4 py-2 rounded hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowGroupForm(true)}
            className="text-sm text-[#2582eb] hover:underline"
          >
            + Add Variant Group
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-slate-800 text-white px-6 mt-7 py-2 hover:bg-slate-900 rounded transition disabled:opacity-60"
      >
        Add product
      </button>
    </form>
  );
}

