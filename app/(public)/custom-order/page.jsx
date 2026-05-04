"use client";

import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  UploadCloudIcon,
  MicIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  StoreIcon,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { categories } from "@/assets/assets";
import StoreSearch from "@/components/StoreSearch";
import { addCustomRequest } from "@/lib/features/customRequest/customRequestSlice";

// ==========================================
// 1. SUB-COMPONENTS (Reused with minor modifications)
// ==========================================

const ImageUploader = ({ images, setImages, required = false }) => {
  // Use ref to track current images for cleanup
  const imagesRef = useRef(images);
  
  // Update ref when images change
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const handleImageUpload = (e) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed.");
      return;
    }

    const valid = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" is not a valid image.`);
        return false;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 2MB.`);
        return false;
      }
      return true;
    });

    const mapped = valid.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...mapped]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  return (
    <div className="w-full">
      <label htmlFor="image-upload" className="block mb-2 font-medium">
        Visual Inspiration (Max 5) {required && <span className="text-red-500">*</span>}
      </label>
      <label
        htmlFor="image-upload"
        className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 transition-colors bg-[#faf8f5] ${images.length >= 5 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"}`}
      >
        <UploadCloudIcon className="text-slate-400 mb-2" size={32} />
        <span className="text-sm text-slate-500">Upload Sketches / Photos</span>
        <input
          id="image-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          hidden
          disabled={images.length >= 5}
        />
      </label>

      {images.length > 0 && (
        <div className="flex gap-4 mt-4 overflow-x-auto pb-2 px-1" role="list">
          {images.map((img, idx) => (
            <div key={idx} className="relative shrink-0" role="listitem">
              <Image
                src={img.preview}
                alt={`Upload preview ${idx + 1}`}
                width={80}
                height={80}
                className="object-cover rounded-lg h-20 w-20 border border-slate-200"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                aria-label="Remove image"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
              >
                <XIcon size={14} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
      {required && images.length === 0 && (
        <p className="mt-2 text-sm text-red-500">At least one image is required</p>
      )}
    </div>
  );
};

const ColorPalette = ({ colors, setColors, disabled = false }) => {
  const handleAdd = () =>
    setColors((prev) => [...prev, { hex: "#000000", description: "" }]);
  const handleUpdate = (index, field, value) => {
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };
  const handleRemove = (index) =>
    setColors((prev) => prev.filter((_, i) => i !== index));

  if (disabled) return null;

  return (
    <div className="w-full mb-4">
      <label className="block mb-2 font-medium">Color Palette</label>
      {colors.map((c, i) => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <input
            type="color"
            value={c.hex}
            onChange={(e) => handleUpdate(i, "hex", e.target.value)}
            aria-label={`Select color ${i + 1}`}
            className="w-12 h-12 rounded-lg cursor-pointer shrink-0 border-0 p-0"
          />
          <input
            type="text"
            value={c.description}
            onChange={(e) => handleUpdate(i, "description", e.target.value)}
            placeholder='e.g., "color of the table legs" or "main body color"'
            aria-label={`Color description ${i + 1}`}
            className="flex-1 border border-slate-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-[#e67e22] bg-[#faf8f5]"
          />
          {colors.length > 1 && (
            <button
              type="button"
              onClick={() => handleRemove(i)}
              aria-label="Remove color"
              className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
            >
              <Trash2Icon size={20} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 text-sm text-[#2582eb] hover:text-[#1c355e] font-medium transition-colors"
      >
        <PlusIcon size={16} /> Add color
      </button>
    </div>
  );
};

const AudioRecorder = ({ audioBlob, setAudioBlob }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);

  // Safe preview URL management
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setAudioUrl(null);
  }, [audioBlob]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          setAudioBlob(new Blob(chunks, { type: "audio/webm" }));
          stream.getTracks().forEach((track) => track.stop());
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Microphone access denied.");
      }
    }
  };

  return (
    <div className="w-full">
      <label className="block mb-2 font-medium">Voice Memo (Optional)</label>
      {!audioBlob ? (
        <div className="flex items-center gap-4 p-4 border border-slate-300 rounded-xl bg-[#faf8f5]">
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            className={`p-4 rounded-full text-white shadow-md shrink-0 transition-all ${isRecording ? "bg-red-500 animate-pulse" : "bg-[#1c355e] hover:bg-[#2582eb]"}`}
          >
            <MicIcon size={24} />
          </button>
          <p className="text-sm text-slate-500">
            {isRecording
              ? "Recording... Click to stop"
              : "Record details text might miss."}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 border border-slate-300 rounded-xl bg-[#faf8f5]">
          {audioUrl && <audio src={audioUrl} controls className="flex-1" />}
          <button
            type="button"
            onClick={() => setAudioBlob(null)}
            aria-label="Delete voice memo"
            className="p-3 bg-red-100 text-red-500 rounded-xl hover:bg-red-200 transition-colors shrink-0"
          >
            <Trash2Icon size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

const SizeInput = ({ size, setSize }) => {
  const handleDimensionChange = (e) => {
    const val = e.target.value;
    setSize((prev) => ({
      ...prev,
      [e.target.name]: val === "" ? "" : Number(val),
    }));
  };

  return (
    <div className="w-full">
      <label className="block mb-2 font-medium">Size</label>
      <div className="flex gap-4">
        <input
          aria-label="Length (cm)"
          name="length"
          value={size.length}
          onChange={handleDimensionChange}
          type="number"
          min="0"
          placeholder="Length"
          className="flex-1 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-[#e67e22] rounded-xl bg-[#faf8f5]"
        />
        <input
          aria-label="Width (cm)"
          name="width"
          value={size.width}
          onChange={handleDimensionChange}
          type="number"
          min="0"
          placeholder="Width"
          className="flex-1 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-[#e67e22] rounded-xl bg-[#faf8f5]"
        />
        <input
          aria-label="Height (cm)"
          name="height"
          value={size.height}
          onChange={handleDimensionChange}
          type="number"
          min="0"
          placeholder="Height"
          className="flex-1 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-[#e67e22] rounded-xl bg-[#faf8f5]"
        />
      </div>
    </div>
  );
};

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

const INITIAL_STATE = {
  itemName: "",
  description: "",
  visibility: "open",
  category: "",
  quantity: 1,
  size: { length: "", width: "", height: "" },
  material: "",
  deliveryDate: "",
};

export default function CustomOrderPage() {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [images, setImages] = useState([]);
  const [colors, setColors] = useState([{ hex: "#000000", description: "" }]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState("flexible"); // "1week", "2weeks", "1month", "flexible", "custom"

  // Handlers
  const handleInput = (e) => {
    const { name, value } = e.target;
    if (name === "deliveryDate") {
      setDeliveryOption("custom");
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSize = (newSize) => {
    setFormData((p) => ({ ...p, size: newSize }));
  };

  const handleQuantity = (val) => {
    if (val === "" || val < 1) return;
    setFormData((p) => ({ ...p, quantity: Number(val) }));
  };

  // Determine which fields to show based on category
  const shouldShowSize = ["Woodwork", "Stationery", "Textiles", "Porcelain"].includes(formData.category);
  const shouldShowMaterial = ["Woodwork", "Accessories", "Stationery", "Textiles"].includes(formData.category);
  const shouldShowColorPalette = ["Woodwork", "Accessories", "Stationery", "Textiles", "Porcelain"].includes(formData.category);

  // Compute delivery date based on selected option
  useEffect(() => {
    if (deliveryOption === "flexible") {
      setFormData((p) => ({ ...p, deliveryDate: "" }));
      return;
    }
    if (deliveryOption === "custom") {
      // keep existing date, do nothing
      return;
    }
    // compute date offset
    const today = new Date();
    let offsetDays = 0;
    switch (deliveryOption) {
      case "1week":
        offsetDays = 7;
        break;
      case "2weeks":
        offsetDays = 14;
        break;
      case "1month":
        offsetDays = 30;
        break;
      default:
        offsetDays = 0;
    }
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + offsetDays);
    const dateString = targetDate.toISOString().split("T")[0];
    setFormData((p) => ({ ...p, deliveryDate: dateString }));
  }, [deliveryOption]);

  // Validation
  const validateForm = () => {
    if (!formData.itemName.trim()) return "Item name is required.";
    if (!formData.description.trim()) return "Description is required.";
    if (images.length === 0) return "At least one visual inspiration image is required.";
    if (formData.visibility === "private" && !selectedStore) {
      return "Please select a store for private requests.";
    }
    if (!formData.category) return "Category is required.";
    if (formData.deliveryDate) {
      const today = new Date().toISOString().split("T")[0];
      if (formData.deliveryDate < today) return "Delivery date must be in the future.";
    }
    return null;
  };

  // Check if submit button should be enabled
  const isSubmitEnabled = () => {
    return (
      formData.itemName.trim() &&
      formData.description.trim() &&
      images.length > 0 &&
      formData.category &&
      (formData.visibility !== "private" || selectedStore)
    );
  };

  // Submit (Building the Real FormData)
  const onSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) return toast.error(error);

    try {
      setLoading(true);

      // 1. Initialize FormData
      const submitData = new FormData();

      // 2. Append Text & JSON
      submitData.append("itemName", formData.itemName);
      submitData.append("description", formData.description);
      submitData.append("visibility", formData.visibility);
      if (selectedStore) submitData.append("storeId", selectedStore.id);
      if (formData.category) submitData.append("category", formData.category);
      submitData.append("quantity", String(formData.quantity));
      submitData.append("material", formData.material);
      submitData.append("deliveryDate", formData.deliveryDate);

      // Append complex objects as JSON strings
      submitData.append("size", JSON.stringify(formData.size));
      submitData.append("colors", JSON.stringify(colors));

      // 3. Append Files
      images.forEach((img, i) => submitData.append(`image_${i}`, img.file));
      if (audioBlob) submitData.append("voiceMemo", audioBlob, "memo.webm");

      // Real API Call
      const response = await fetch('/api/custom-order', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Submission failed');
      }

      toast.success("Custom Request Submitted Successfully!");
      
      // Add to Redux store
      dispatch(addCustomRequest(result.request));

      // Reset
      setFormData(INITIAL_STATE);
      setImages([]);
      setColors([{ hex: "#000000", description: "" }]);
      setAudioBlob(null);
      setSelectedStore(null);
      setShowAdditionalDetails(false);
    } catch {
      toast.error("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-6 min-h-[70vh] my-16">
      <form
        onSubmit={onSubmit}
        className="max-w-3xl mx-auto flex flex-col gap-6 text-slate-600 bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        {/* Header */}
        <div className="w-full border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-[#1c355e]">
            Request <span className="text-[#e67e22]">Custom Order</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Describe your vision with as much detail as possible.
          </p>
        </div>

        {/* Main Required Fields */}
        <div className="space-y-6">
          {/* Item Name */}
          <div className="w-full">
            <label htmlFor="itemName" className="block mb-2 font-medium">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              id="itemName"
              name="itemName"
              value={formData.itemName}
              onChange={handleInput}
              type="text"
              placeholder="e.g. Vintage Oak Table"
              className="border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl bg-[#faf8f5]"
            />
          </div>

          {/* Category */}
          <div className="w-full">
            <label htmlFor="category" className="block mb-2 font-medium">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInput}
                className="border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 pr-10 rounded-xl bg-[#faf8f5] appearance-none cursor-pointer"
              >
                <option value="">Select a category</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat} className="capitalize">
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={20}
              />
            </div>
          </div>

          {/* Visual Inspiration */}
          <ImageUploader images={images} setImages={setImages} required />

          {/* Description */}
          <div className="w-full">
            <label htmlFor="description" className="block mb-2 font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInput}
              rows={4}
              placeholder="Describe what you're looking for in detail..."
              className="border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl resize-none bg-[#faf8f5]"
            />
          </div>

          {/* Request Visibility */}
          <fieldset className="w-full">
            <legend className="block mb-4 font-bold text-[#1c355e]">
              Request Visibility <span className="text-red-500">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                htmlFor="vis-open"
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.visibility === "open" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-white"}`}
              >
                <input
                  id="vis-open"
                  type="radio"
                  name="visibility"
                  checked={formData.visibility === "open"}
                  onChange={() => setFormData((p) => ({ ...p, visibility: "open" }))}
                  className="accent-[#2582eb] w-5 h-5"
                />
                <div>
                  <p className="font-medium text-slate-800">Open Request</p>
                  <p className="text-xs text-slate-500">
                    Posted to Custom Request Hub (default)
                  </p>
                </div>
              </label>

              <label
                htmlFor="vis-private"
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.visibility === "private" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-white"}`}
              >
                <input
                  id="vis-private"
                  type="radio"
                  name="visibility"
                  checked={formData.visibility === "private"}
                  onChange={() => setFormData((p) => ({ ...p, visibility: "private" }))}
                  className="accent-[#2582eb] w-5 h-5"
                />
                <div>
                  <p className="font-medium text-slate-800">Private Request</p>
                  <p className="text-xs text-slate-500">
                    Sent to a specific artisan
                  </p>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Store Search (only for private) */}
          {formData.visibility === "private" && (
            <StoreSearch
              selectedStore={selectedStore}
              onSelectStore={setSelectedStore}
            />
          )}
        </div>

        {/* Additional Details Toggle */}
        <button
          type="button"
          onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
          className="flex items-center justify-between w-full p-4 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <PlusIcon size={20} className="text-[#2582eb]" />
            <span className="font-medium text-slate-800">Additional Details (Optional)</span>
          </div>
          {showAdditionalDetails ? (
            <ChevronUpIcon size={20} className="text-slate-500" />
          ) : (
            <ChevronDownIcon size={20} className="text-slate-500" />
          )}
        </button>

        {/* Additional Details Section */}
        {showAdditionalDetails && (
          <div className="space-y-6 border-t border-slate-200 pt-6">


            {/* Voice Memo */}
            <AudioRecorder audioBlob={audioBlob} setAudioBlob={setAudioBlob} />

            {/* Quantity */}
            <div className="w-full">
              <label className="block mb-2 font-medium">Quantity</label>
              <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-lg p-1 w-fit">
                <button
                  type="button"
                  onClick={() => handleQuantity(formData.quantity - 1)}
                  aria-label="Decrease quantity"
                  className="p-2 hover:bg-slate-100 rounded-md"
                  disabled={formData.quantity <= 1}
                >
                  <MinusIcon size={18} />
                </button>
                <input
                  aria-label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleQuantity(e.target.value)}
                  onBlur={(e) => {
                    if (!e.target.value) handleQuantity(1);
                  }}
                  className="w-12 text-center font-bold outline-none"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => handleQuantity(formData.quantity + 1)}
                  aria-label="Increase quantity"
                  className="p-2 hover:bg-slate-100 rounded-md text-[#2582eb]"
                >
                  <PlusIcon size={18} />
                </button>
              </div>
            </div>

            {/* Size */}
            {shouldShowSize && <SizeInput size={formData.size} setSize={handleSize} />}

            {/* Material (conditionally shown) */}
            {shouldShowMaterial && (
              <div className="w-full">
                <label htmlFor="material" className="block mb-2 font-medium">
                  Material
                </label>
                <input
                  id="material"
                  name="material"
                  value={formData.material}
                  onChange={handleInput}
                  type="text"
                  placeholder="e.g., Clay, Wool, Oak"
                  className="border border-slate-300 w-full p-3 rounded-xl bg-[#faf8f5] outline-none focus:ring-2 focus:ring-[#e67e22]"
                />
              </div>
            )}

            {/* Color Palette (conditionally shown) */}
            <ColorPalette
              colors={colors}
              setColors={setColors}
              disabled={!shouldShowColorPalette}
            />

            {/* Delivery Date */}
            <div className="w-full">
              <label htmlFor="deliveryDate" className="block mb-2 font-medium">
                Desired Delivery Date
              </label>
              <input
                id="deliveryDate"
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleInput}
                className="border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl bg-[#faf8f5]"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !isSubmitEnabled()}
          className={`w-full mt-4 bg-gradient-to-r from-[#e67e22] to-[#d35400] text-white font-bold rounded-full py-4 shadow-md text-lg transition-all uppercase ${!isSubmitEnabled() ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01]"}`}
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>

        <p className="text-sm text-slate-500 text-center">
          Required fields are marked with <span className="text-red-500">*</span>
        </p>
      </form>
    </div>
  );
}
