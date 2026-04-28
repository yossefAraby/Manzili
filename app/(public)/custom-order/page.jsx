"use client";

import { useState, useEffect, useRef } from "react";
import {
  UploadCloudIcon,
  LinkIcon,
  MicIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  MinusIcon,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

// ==========================================
// 1. SUB-COMPONENTS
// ==========================================

const ImageUploader = ({ images, setImages }) => {
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
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  return (
    <div className="w-full">
      <label htmlFor="image-upload" className="block mb-2 font-medium">
        Visual Inspiration (Max 5)
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
    </div>
  );
};

const ColorPalette = ({ colors, setColors }) => {
  const handleAdd = () =>
    setColors((prev) => [...prev, { hex: "#000000", description: "" }]);
  const handleUpdate = (index, field, value) => {
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };
  const handleRemove = (index) =>
    setColors((prev) => prev.filter((_, i) => i !== index));

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
            placeholder='e.g. "Matte finish" or "Terracotta"'
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

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

const INITIAL_STATE = {
  name: "",
  pinterestLink: "",
  material: "",
  size: { length: "", width: "", height: "" },
  orderType: "one-piece",
  quantity: 1,
  visibility: "open",
  notes: "",
  deliveryDate: "",
};

export default function CustomOrderPage() {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [images, setImages] = useState([]);
  const [colors, setColors] = useState([{ hex: "#000000", description: "" }]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleInput = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSize = (e) => {
    const val = e.target.value;
    setFormData((p) => ({
      ...p,
      size: { ...p.size, [e.target.name]: val === "" ? "" : Number(val) },
    }));
  };

  const handleQuantity = (val) => {
    if (val === "" || val < 1) return;
    setFormData((p) => ({ ...p, quantity: Number(val) }));
  };

  // Validation
  const validateForm = () => {
    if (!formData.name.trim()) return "Project name is required.";
    if (!formData.material.trim()) return "Material is required.";
    if (!formData.deliveryDate) return "Delivery date is required.";

    // URL Validation
    if (formData.pinterestLink) {
      try {
        new URL(formData.pinterestLink);
      } catch {
        return "Invalid URL";
      }
    }

    // Dimensions Validation
    const { length, width, height } = formData.size;
    if (
      (length !== "" && length <= 0) ||
      (width !== "" && width <= 0) ||
      (height !== "" && height <= 0)
    ) {
      return "Dimensions must be greater than zero.";
    }

    // Date Validation
    const today = new Date().toISOString().split("T")[0];
    if (formData.deliveryDate < today)
      return "Delivery date must be in the future.";

    return null;
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
      submitData.append("name", formData.name);
      submitData.append("pinterestLink", formData.pinterestLink);
      submitData.append("material", formData.material);
      submitData.append("orderType", formData.orderType);
      submitData.append("quantity", String(formData.quantity));
      submitData.append("visibility", formData.visibility);
      submitData.append("deliveryDate", formData.deliveryDate);
      submitData.append("notes", formData.notes);

      // Append complex objects as JSON strings
      submitData.append("size", JSON.stringify(formData.size));
      submitData.append("colors", JSON.stringify(colors));

      // 3. Append Files
      images.forEach((img, i) => submitData.append(`image_${i}`, img.file));
      if (audioBlob) submitData.append("voiceMemo", audioBlob, "memo.webm");

      // Mock API Call: fetch('/api/custom-order', { method: 'POST', body: submitData })
      await new Promise((res) => setTimeout(res, 1500));

      toast.success("Order Submitted Successfully!");

      // Reset
      setFormData(INITIAL_STATE);
      setImages([]);
      setColors([{ hex: "#000000", description: "" }]);
      setAudioBlob(null);
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

        {/* Basic Info */}
        <div className="w-full">
          <label htmlFor="projectName" className="block mb-2 font-medium">
            Project Name
          </label>
          <input
            id="projectName"
            name="name"
            value={formData.name}
            onChange={handleInput}
            type="text"
            placeholder="e.g. Vintage Oak Table"
            className="border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl bg-[#faf8f5]"
          />
        </div>

        {/* Uploads */}
        <ImageUploader images={images} setImages={setImages} />

        <div className="w-full flex items-center bg-[#faf8f5] border border-slate-300 rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#e67e22] transition-all">
          <LinkIcon className="text-slate-400" size={20} aria-hidden="true" />
          <input
            aria-label="Pinterest Link"
            name="pinterestLink"
            value={formData.pinterestLink}
            onChange={handleInput}
            type="url"
            placeholder="Pinterest Board or Pin URL"
            className="w-full p-3 outline-none bg-transparent"
          />
        </div>

        {/* Material & Colors */}
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
            className="border border-slate-300 w-full p-3 rounded-xl mb-4 bg-[#faf8f5] outline-none focus:ring-2 focus:ring-[#e67e22]"
          />
          <ColorPalette colors={colors} setColors={setColors} />
        </div>

        {/* Dimensions */}
        <fieldset className="w-full">
          <legend className="block mb-2 font-medium">
            Specific Dimensions (cm)
          </legend>
          <div className="flex gap-4">
            <input
              aria-label="Length"
              name="length"
              value={formData.size.length}
              onChange={handleSize}
              type="number"
              min="0"
              placeholder="Length"
              className="flex-1 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-[#e67e22] rounded-xl bg-[#faf8f5]"
            />
            <input
              aria-label="Width"
              name="width"
              value={formData.size.width}
              onChange={handleSize}
              type="number"
              min="0"
              placeholder="Width"
              className="flex-1 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-[#e67e22] rounded-xl bg-[#faf8f5]"
            />
            <input
              aria-label="Height"
              name="height"
              value={formData.size.height}
              onChange={handleSize}
              type="number"
              min="0"
              placeholder="Height"
              className="flex-1 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-[#e67e22] rounded-xl bg-[#faf8f5]"
            />
          </div>
        </fieldset>

        {/* Quantity & Order Type */}
        <fieldset className="w-full py-6 border-y border-slate-200">
          <legend className="block mb-4 font-bold text-[#1c355e]">
            Quantity Options
          </legend>
          <div className="flex flex-col gap-4">
            <label
              htmlFor="opt-one"
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.orderType === "one-piece" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <input
                id="opt-one"
                type="radio"
                name="orderType"
                checked={formData.orderType === "one-piece"}
                onChange={() =>
                  setFormData((p) => ({
                    ...p,
                    orderType: "one-piece",
                    quantity: 1,
                  }))
                }
                className="accent-[#2582eb] w-5 h-5"
              />
              <span className="font-medium text-slate-800">One Piece</span>
            </label>

            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border-2 ${formData.orderType === "multiple" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <label
                htmlFor="opt-multi"
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  id="opt-multi"
                  type="radio"
                  name="orderType"
                  checked={formData.orderType === "multiple"}
                  onChange={() =>
                    setFormData((p) => ({ ...p, orderType: "multiple" }))
                  }
                  className="accent-[#2582eb] w-5 h-5"
                />
                <span className="font-medium text-slate-800">
                  Multiple Pieces
                </span>
              </label>

              {formData.orderType === "multiple" && (
                <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-lg p-1 mt-4 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => handleQuantity(formData.quantity - 1)}
                    aria-label="Decrease quantity"
                    className="p-2 hover:bg-slate-100 rounded-md"
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
              )}
            </div>
          </div>
        </fieldset>

        {/* Visibility */}
        <fieldset className="w-full pb-6 border-b border-slate-200">
          <legend className="block my-4 font-bold text-[#1c355e]">
            Request Visibility
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              htmlFor="vis-private"
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.visibility === "private" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <input
                id="vis-private"
                type="radio"
                name="visibility"
                checked={formData.visibility === "private"}
                onChange={() =>
                  setFormData((p) => ({ ...p, visibility: "private" }))
                }
                className="accent-[#2582eb] w-5 h-5"
              />
              <div>
                <p className="font-medium text-slate-800">Private Request</p>
                <p className="text-xs text-slate-500">
                  Sent to a specific artisan
                </p>
              </div>
            </label>

            <label
              htmlFor="vis-open"
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer ${formData.visibility === "open" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <input
                id="vis-open"
                type="radio"
                name="visibility"
                checked={formData.visibility === "open"}
                onChange={() =>
                  setFormData((p) => ({ ...p, visibility: "open" }))
                }
                className="accent-[#2582eb] w-5 h-5"
              />
              <div>
                <p className="font-medium text-slate-800">Open Request</p>
                <p className="text-xs text-slate-500">
                  Posted to Custom Request Hub
                </p>
              </div>
            </label>
          </div>
        </fieldset>

        {/* Delivery & Notes */}
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

        <div className="w-full">
          <label htmlFor="notes" className="block mb-2 font-medium">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInput}
            rows={4}
            className="border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl resize-none bg-[#faf8f5]"
          />
        </div>

        {/* Audio */}
        <AudioRecorder audioBlob={audioBlob} setAudioBlob={setAudioBlob} />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 bg-gradient-to-r from-[#e67e22] to-[#d35400] text-white font-bold rounded-full py-4 shadow-md text-lg hover:scale-[1.01] transition-all uppercase disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
