"use client";

import { assets, categories } from "@/assets/assets";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { getCurrencySymbol } from "@/lib/currency";
import { uploadImage } from "@/lib/api/seller";

const isColorType = (type) => /color|colour/i.test(type);

const uploadAreaSrc =
  typeof assets.upload_area === "string"
    ? assets.upload_area
    : assets.upload_area?.src;

/**
 * Shared product editor used by BOTH add-product (mode="create") and the dedicated
 * edit route (mode="edit"). It owns the whole form body:
 *   - a 4-slot image uploader (edit mode seeds the slots from existing image URLs and
 *     only uploads newly-picked File objects, so saving without re-picking keeps images)
 *   - the product info fields (name/description/material/price/sale/stock/shipping/category)
 *   - the variant-group builder: named GROUPS (Size, Color, …) each with OPTIONS that
 *     carry an "Extra cost (+EGP)" priceDelta, per-option stock, a color swatch, and an
 *     optional image.
 *
 * On submit it uploads any picked image Files to hosted URLs, then calls
 * onSubmit(payload) with a GROUPED variant array matching the backend contract:
 *   variants: [{ name, options: [{ value, stock, priceDelta, swatch, imageUrl }] }]
 *
 * Props:
 *   mode      "create" | "edit"
 *   initial   adapted product (edit mode) — { name, description, material, mrp, price,
 *             stock, category, shippingSize, shippingBulkyCategory, images:[url],
 *             variants:[{ type, name, swatch, priceDelta, stock, image }] }
 *   submitLabel  button text
 *   onSubmit  async (payload) => void   — throws bubble up to the caller's toast
 */
export default function ProductForm({
  mode = "create",
  initial = null,
  submitLabel,
  onSubmit,
}) {
  const currency = getCurrencySymbol();

  // ── Images: each slot holds either a File (newly picked) or a string URL (existing) ──
  const [images, setImages] = useState(() => {
    const slots = { 1: null, 2: null, 3: null, 4: null };
    const existing = Array.isArray(initial?.images) ? initial.images : [];
    existing.slice(0, 4).forEach((url, i) => {
      if (url) slots[i + 1] = url;
    });
    return slots;
  });

  const [productInfo, setProductInfo] = useState(() => ({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    material: initial?.material ?? "",
    mrp: initial?.mrp != null && initial?.mrp !== "" ? String(initial.mrp) : "",
    // Only prefill the sale field when it's a real discount below the list price.
    price:
      Number(initial?.price) > 0 && Number(initial?.price) < Number(initial?.mrp)
        ? String(initial.price)
        : "",
    stock: initial?.stock != null ? String(initial.stock) : "",
    category: initial?.category ?? "",
    shippingSize: initial?.shippingSize ?? "MEDIUM",
    shippingBulkyCategory: initial?.shippingBulkyCategory ?? "NORMAL",
  }));

  const [loading, setLoading] = useState(false);

  // ── Variant groups: regroup the flat initial variants by type ──
  const [variantGroups, setVariantGroups] = useState(() => {
    const flat = Array.isArray(initial?.variants) ? initial.variants : [];
    const byType = {};
    flat.forEach((v) => {
      const type = v.type || "";
      if (!byType[type]) byType[type] = [];
      byType[type].push({
        id: `${type}-${v.name}-${byType[type].length}`,
        name: v.name,
        swatch: v.swatch || (isColorType(type) ? "#cccccc" : ""),
        priceDelta: Number(v.priceDelta) || 0,
        stock: Number(v.stock) || 0,
        // existing hosted image URL (string) — no File until the seller re-picks
        image: v.image || (Array.isArray(v.images) ? v.images[0] : null) || null,
      });
    });
    return Object.entries(byType).map(([type, options]) => ({
      id: `grp-${type}`,
      type,
      options,
    }));
  });

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupType, setNewGroupType] = useState("");
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [newOptionForm, setNewOptionForm] = useState({
    name: "",
    swatch: "#cccccc",
    priceDelta: "",
    stock: "",
    image: null,
  });

  const resetOptionForm = () => {
    setNewOptionForm({ name: "", swatch: "#cccccc", priceDelta: "", stock: "", image: null });
  };

  const addVariantGroup = () => {
    const type = newGroupType.trim();
    if (!type) {
      toast.error("Variant group type is required");
      return;
    }
    if (variantGroups.some((g) => g.type.toLowerCase() === type.toLowerCase())) {
      toast.error("A group with this type already exists");
      return;
    }
    setVariantGroups((prev) => [...prev, { id: `grp-${Date.now()}`, type, options: [] }]);
    setNewGroupType("");
    setShowGroupForm(false);
  };

  const removeVariantGroup = (id) => {
    setVariantGroups((prev) => prev.filter((g) => g.id !== id));
    if (activeGroupId === id) {
      resetOptionForm();
      setActiveGroupId(null);
    }
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
    if (newOptionForm.stock === "" && newOptionForm.stock !== 0) {
      toast.error("Stock quantity is required");
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
                  id: `${groupId}-${Date.now()}`,
                  name,
                  swatch: isColorType(group.type) ? newOptionForm.swatch : "",
                  priceDelta: Number(newOptionForm.priceDelta) || 0,
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

  const updateOptionForm = (field, value) =>
    setNewOptionForm((prev) => ({ ...prev, [field]: value }));

  const onChangeHandler = (e) =>
    setProductInfo({ ...productInfo, [e.target.name]: e.target.value });

  const hasVariants = variantGroups.some((g) => g.options.length > 0);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ── Validate scalar fields ──
      const trimmedName = productInfo.name.trim();
      if (!trimmedName) {
        toast.error("Product name is required");
        setLoading(false);
        return;
      }
      const parsedMrp = Number(productInfo.mrp);
      if (!Number.isFinite(parsedMrp) || parsedMrp <= 0) {
        toast.error("Price must be greater than 0");
        setLoading(false);
        return;
      }
      const hasSale = productInfo.price !== "" && Number(productInfo.price) > 0;
      const parsedSale = Number(productInfo.price);
      if (hasSale && parsedSale >= parsedMrp) {
        toast.error("Sale price must be below the price");
        setLoading(false);
        return;
      }
      if (!productInfo.category.trim()) {
        toast.error("Select a category");
        setLoading(false);
        return;
      }

      // ── Images: keep existing URLs, upload newly-picked Files ──
      const imageUrls = [];
      for (const key of Object.keys(images)) {
        const slot = images[key];
        if (!slot) continue;
        if (typeof slot === "string") {
          imageUrls.push(slot);
        } else if (slot instanceof File) {
          const url = await uploadImage(slot);
          if (url) imageUrls.push(url);
        }
      }

      // ── Variants → grouped payload, uploading any per-option image File ──
      const variants = [];
      for (const group of variantGroups) {
        if (group.options.length === 0) continue;
        const options = [];
        for (const opt of group.options) {
          let imageUrl = null;
          if (opt.image instanceof File) {
            imageUrl = await uploadImage(opt.image);
          } else if (typeof opt.image === "string") {
            imageUrl = opt.image; // existing hosted URL — keep it
          }
          options.push({
            value: opt.name,
            stock: Number(opt.stock) || 0,
            priceDelta: Number(opt.priceDelta) || 0,
            swatch: isColorType(group.type) ? opt.swatch || null : null,
            imageUrl,
          });
        }
        variants.push({ name: group.type, options });
      }

      // ── Stock: variant products track stock per option (overall = sum) ──
      const simpleStock = Number(productInfo.stock);
      if (
        !hasVariants &&
        (productInfo.stock === "" || !Number.isFinite(simpleStock) || simpleStock < 0)
      ) {
        toast.error("Enter the stock quantity for this product");
        setLoading(false);
        return;
      }
      const stock = hasVariants
        ? variants.reduce(
            (sum, g) => sum + g.options.reduce((s, o) => s + (Number(o.stock) || 0), 0),
            0,
          )
        : simpleStock;

      const payload = {
        name: trimmedName,
        description: productInfo.description.trim(),
        material: productInfo.material.trim(),
        mrp: parsedMrp,
        price: hasSale ? parsedSale : parsedMrp,
        stock,
        inStock: stock > 0,
        images: imageUrls,
        category: productInfo.category.trim(),
        variants,
        shippingSize: productInfo.shippingSize,
        shippingBulkyCategory: productInfo.shippingBulkyCategory,
      };

      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  const imagePreview = (slot) => {
    if (!slot) return uploadAreaSrc;
    if (typeof slot === "string") return slot;
    return URL.createObjectURL(slot);
  };

  return (
    <form onSubmit={onSubmitHandler} className="text-slate-500 mb-28">
      <p className="mt-2">Product images</p>

      <div className="flex gap-3 mt-4">
        {Object.keys(images).map((key) => (
          <label key={key} htmlFor={`images${key}`}>
            <Image
              width={300}
              height={300}
              className="h-15 w-auto border border-slate-200 rounded cursor-pointer"
              src={imagePreview(images[key])}
              alt=""
            />
            <input
              type="file"
              accept="image/*"
              id={`images${key}`}
              onChange={(e) =>
                setImages({ ...images, [key]: e.target.files?.[0] || images[key] })
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
          Price (EGP)
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
          Sale price (EGP)
          <input
            type="number"
            name="price"
            onChange={onChangeHandler}
            value={productInfo.price}
            placeholder="—"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            min={0}
            step="0.01"
          />
          <span className="text-xs text-slate-400 max-w-45">
            Optional — only if the item is discounted (below the price).
          </span>
        </label>
        <label className="flex flex-col gap-2 ">
          Stock (units)
          <input
            type="number"
            name="stock"
            onChange={onChangeHandler}
            value={productInfo.stock}
            placeholder="0"
            className="w-full max-w-45 p-2 px-4 outline-none border border-slate-200 rounded"
            min={0}
            step="1"
            disabled={hasVariants}
          />
          <span className="text-xs text-slate-400 max-w-45">
            {hasVariants
              ? "Tracked per variant option below."
              : "How many units you have to sell."}
          </span>
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
        onChange={(e) => setProductInfo({ ...productInfo, category: e.target.value })}
        value={productInfo.category}
        className="w-full max-w-sm p-2 px-4 my-2 outline-none border border-slate-200 rounded"
        required
      >
        <option value="">Select a category</option>
        {/* Keep the product's current category selectable even if it isn't in the
            seed list (a custom category created earlier). */}
        {!categories.includes(productInfo.category) && productInfo.category && (
          <option value={productInfo.category}>{productInfo.category}</option>
        )}
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
          Group options (Size, Color, …). Each option can add an extra cost on top of
          the base price, with its own stock, color swatch and image.
        </p>

        {/* Existing groups */}
        {variantGroups.map((group) => (
          <div key={group.id} className="mb-4 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">{group.type}</p>
              <button
                type="button"
                onClick={() => removeVariantGroup(group.id)}
                className="text-xs text-rose-500 hover:text-rose-700"
              >
                Remove Group
              </button>
            </div>

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
                  <span className="font-medium text-slate-700 min-w-0">{opt.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {Number(opt.priceDelta) > 0
                      ? `+${currency}${opt.priceDelta}`
                      : "—"}
                  </span>
                  <span className="text-xs text-slate-400">Stock: {opt.stock || 0}</span>
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

            {activeGroupId === group.id ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <input
                    type="text"
                    value={newOptionForm.name}
                    onChange={(e) => updateOptionForm("name", e.target.value)}
                    placeholder="Name (e.g. Red)"
                    className="col-span-2 p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
                  />
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Extra cost (+{currency})
                    </label>
                    <input
                      type="number"
                      value={newOptionForm.priceDelta}
                      onChange={(e) => updateOptionForm("priceDelta", e.target.value)}
                      placeholder="0"
                      min={0}
                      step="0.01"
                      className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Stock *</label>
                    <input
                      type="number"
                      value={newOptionForm.stock}
                      onChange={(e) => updateOptionForm("stock", e.target.value)}
                      placeholder="0"
                      required
                      min={0}
                      className="w-full p-2 px-3 text-sm border border-slate-200 rounded outline-slate-400"
                    />
                  </div>
                  <div className="col-span-2">
                    {isColorType(group.type) && (
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Swatch:</span>
                        <input
                          type="color"
                          value={newOptionForm.swatch}
                          onChange={(e) => updateOptionForm("swatch", e.target.value)}
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
                        updateOptionForm("image", e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                    {newOptionForm.image ? newOptionForm.image.name : "Upload image"}
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
            <p className="text-sm font-medium text-slate-700 mb-3">New Variant Group</p>
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
        {submitLabel || (mode === "edit" ? "Save changes" : "Add product")}
      </button>
    </form>
  );
}
