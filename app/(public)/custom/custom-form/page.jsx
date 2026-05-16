"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  UploadCloudIcon,
  MicIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { categories } from "@/assets/assets";
import StoreSearch from "@/components/StoreSearch";
import { addCustomRequest } from "@/lib/features/customRequest/customRequestSlice";
import {
  addLocalCustomRequest,
  blobToDataURL,
  fileToDataURL,
} from "@/lib/customRequestsLocal";

const CUSTOMIZE_SEED_KEY = "manzili_customize_seed_v1";

/**
 * Fetch each seed image URL and turn it into a {file, preview} entry the
 * existing ImageUploader expects. Skips anything that fails to load so a
 * broken URL doesn't sink the whole prefill.
 */
async function hydrateSeedImages(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  const results = await Promise.all(
    urls.map(async (url, idx) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const ext = blob.type.split("/")[1] || "jpg";
        const file = new File([blob], `customize-source-${idx}.${ext}`, {
          type: blob.type || "image/jpeg",
        });
        return { file, preview: URL.createObjectURL(file) };
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

// ==========================================
// 1. SUB-COMPONENTS (Reused with minor modifications)
// ==========================================

const ImageUploader = ({ images, setImages, required = false, itemName = "" }) => {
  // Open Pinterest in a new tab pre-filled with whatever the buyer has typed
  // so far. Disabled when there's nothing to search yet — Pinterest's empty
  // search is just noise.
  const trimmedQuery = (itemName || "").trim();
  const canInspire = trimmedQuery.length > 0;
  const openPinterest = () => {
    if (!canInspire) return;
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(trimmedQuery)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
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
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <label htmlFor="image-upload" className="font-medium">
          Visual Inspiration (Max 5) {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={openPinterest}
          disabled={!canInspire}
          title={
            canInspire
              ? `Search Pinterest for "${trimmedQuery}"`
              : "Type an item name first to inspire from Pinterest"
          }
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            canInspire
              ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
              : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
          }`}
        >
          Inspire from Pinterest
        </button>
      </div>
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

/**
 * Two-tab size picker:
 *   - "dimensions":    length/width/height numeric inputs (cm).
 *   - "shipping-size": Bosta's `specs.size` enum — five buckets the carrier
 *                     understands (see skills/Bosta Server APIs.yaml line 1143).
 * The tab strip is styled to match the existing tab patterns in this app
 * (border-b underline on the active tab, muted color on the inactive one).
 */
const PACKAGE_OPTIONS = [
  { value: "SMALL", label: "Small", hint: "Fits in one hand" },
  { value: "MEDIUM", label: "Medium", hint: "Carried with two hands" },
  { value: "LARGE", label: "Large", hint: "Bigger than a shoebox" },
  { value: "Light Bulky", label: "Light Bulky", hint: "Oversized but lightweight" },
  { value: "Heavy Bulky", label: "Heavy Bulky", hint: "Oversized and heavy" },
];

const SizeInput = ({ size, setSize, mode, setMode, packageSize, setPackageSize }) => {
  const handleDimensionChange = (e) => {
    const val = e.target.value;
    setSize((prev) => ({
      ...prev,
      [e.target.name]: val === "" ? "" : Number(val),
    }));
  };

  const tabs = [
    { id: "dimensions", label: "Dimensions" },
    { id: "package", label: "Shipping size" },
  ];

  return (
    <div className="w-full">
      <label className="block mb-2 font-medium">Size</label>

      {/* Tab switch */}
      <div className="flex border-b border-slate-200 mb-4">
        {tabs.map((t) => {
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              aria-pressed={active}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-b-[1.5px] border-[#e67e22] text-[#1c355e]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {mode === "dimensions" ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "length", placeholder: "Length", aria: "Length (cm)" },
            { name: "width", placeholder: "Width", aria: "Width (cm)" },
            { name: "height", placeholder: "Height", aria: "Height (cm)" },
          ].map((f) => (
            <div key={f.name} className="relative">
              <input
                aria-label={f.aria}
                name={f.name}
                value={size[f.name]}
                onChange={handleDimensionChange}
                type="number"
                min="0"
                placeholder={f.placeholder}
                className="w-full border border-slate-300 rounded-xl bg-[#faf8f5] outline-none focus:ring-2 focus:ring-[#e67e22] px-3 py-2.5 pr-10 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                cm
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PACKAGE_OPTIONS.map((opt) => {
            const active = packageSize === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setPackageSize(opt.value)}
                aria-pressed={active}
                className={`text-left rounded-xl border-2 p-3 transition-colors ${
                  active
                    ? "border-[#2582eb] bg-blue-50"
                    : "border-slate-200 bg-[#fcfbf9] hover:border-slate-300"
                }`}
              >
                <p className="font-medium text-slate-800 text-sm">{opt.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.hint}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Days-based delivery window picker. The single piece of state is `days` —
 *   `null` means "flexible / no deadline"
 *   anything else is days from today
 *
 * UX surface:
 *   - quick-pick chips (Flexible, 1w, 2w, 1mo, 2mo) for one-click choices,
 *   - a slider for fine-tuning (1–120 days), with a number box on the side,
 *   - a live preview of the absolute date so users know what they're picking,
 *   - a "no deadline" toggle that maps back to days = null.
 */
const DELIVERY_PRESETS = [
  { label: "Flexible", days: null },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "2 months", days: 60 },
];
const DELIVERY_MIN_DAYS = 1;
const DELIVERY_MAX_DAYS = 120;

function formatRelativeDays(days) {
  if (days == null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days % 7 === 0 && days < 30) {
    const w = days / 7;
    return `In ${w} week${w > 1 ? "s" : ""}`;
  }
  if (days % 30 === 0) {
    const m = days / 30;
    return `In ${m} month${m > 1 ? "s" : ""}`;
  }
  return `In ${days} days`;
}

function formatTargetDate(days) {
  if (days == null) return "";
  const d = new Date();
  d.setDate(d.getDate() + Number(days));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DeliveryWindowPicker = ({ days, setDays }) => {
  const sliderValue = days ?? 7;
  const targetLabel = formatTargetDate(days);
  const relativeLabel = formatRelativeDays(days);

  const onSliderChange = (e) => {
    const v = Math.max(
      DELIVERY_MIN_DAYS,
      Math.min(DELIVERY_MAX_DAYS, Number(e.target.value) || DELIVERY_MIN_DAYS),
    );
    setDays(v);
  };

  const onNumberChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setDays(null);
      return;
    }
    const n = Math.max(
      DELIVERY_MIN_DAYS,
      Math.min(DELIVERY_MAX_DAYS, Number(raw) || DELIVERY_MIN_DAYS),
    );
    setDays(n);
  };

  return (
    <div className="w-full">
      <label className="block mb-2 font-medium">Delivery window</label>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-3">
        {DELIVERY_PRESETS.map((p) => {
          const active = days === p.days;
          return (
            <button
              type="button"
              key={p.label}
              onClick={() => setDays(p.days)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-[#1c355e] text-white border-[#1c355e]"
                  : "bg-[#faf8f5] text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Slider + numeric input */}
      <div
        className={`rounded-xl border border-slate-300 bg-[#faf8f5] p-3 transition-opacity ${
          days == null ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={DELIVERY_MIN_DAYS}
            max={DELIVERY_MAX_DAYS}
            step={1}
            value={sliderValue}
            onChange={onSliderChange}
            aria-label="Days from today"
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e67e22]"
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={DELIVERY_MIN_DAYS}
              max={DELIVERY_MAX_DAYS}
              value={days ?? ""}
              onChange={onNumberChange}
              placeholder="–"
              className="w-16 text-center px-2 py-1 bg-white border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-[#e67e22]"
              aria-label="Days from today (numeric)"
            />
            <span className="text-xs text-slate-500">days</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium text-[#1c355e]">
            {days == null ? "No deadline — flexible" : relativeLabel}
          </span>
          <span className="text-slate-500">
            {targetLabel ? `Target · ${targetLabel}` : "Pick a preset or drag the slider"}
          </span>
        </div>
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
  // Two-mode size: "dimensions" uses `size`, "package" uses `packageSize` and
  // matches the SMALL/MEDIUM/LARGE buckets on /store/add-product so an artisan
  // can quote shipping the same way priced products do.
  sizeMode: "dimensions",
  packageSize: "MEDIUM",
  material: "",
  deliveryDate: "",
};

function CustomOrderPageInner() {
  const router = useRouter();
  const dispatch = useDispatch();
  const session = useSelector((s) => s.auth.session);
  const searchParams = useSearchParams();
  const customizeId = searchParams.get("customize");

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [images, setImages] = useState([]);
  const [colors, setColors] = useState([{ hex: "#000000", description: "" }]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  // null = flexible (no specific date); otherwise an integer "days from today".
  // We keep this as the single source of truth and derive the absolute date
  // only when submitting / displaying — much friendlier than two coupled states.
  const [deliveryDays, setDeliveryDays] = useState(null);

  // Prefill from the /product "Customize this for me" CTA: read the seed out
  // of sessionStorage, populate the form, default visibility to private and
  // pre-select the source product's store as the recipient artisan.
  useEffect(() => {
    if (!customizeId) return;
    let cancelled = false;
    try {
      const raw = sessionStorage.getItem(CUSTOMIZE_SEED_KEY);
      if (!raw) return;
      const seed = JSON.parse(raw);
      if (!seed || seed.productId !== customizeId) return;
      sessionStorage.removeItem(CUSTOMIZE_SEED_KEY);

      setFormData((p) => ({
        ...p,
        itemName: seed.itemName ? `Custom ${seed.itemName}` : p.itemName,
        description: seed.description
          ? `Inspired by "${seed.itemName}". Please tweak the following: \n\n${seed.description}`
          : p.description,
        category: seed.category || p.category,
        material: seed.material || p.material,
        visibility: seed.store?.id ? "private" : p.visibility,
      }));
      if (seed.store?.id) setSelectedStore(seed.store);
      setShowAdditionalDetails(true);

      hydrateSeedImages(seed.imageUrls).then((mapped) => {
        if (!cancelled && mapped.length > 0) setImages(mapped);
      });
      toast.success("Prefilled from the original item — tweak anything you like");
    } catch {
      /* ignore — leave the form blank */
    }
    return () => {
      cancelled = true;
    };
  }, [customizeId]);

  // Handlers
  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  // `setSize` is consumed inside SizeInput as a React-style setter — callers
  // pass either a next object or an updater fn. Forwarding both shapes keeps
  // the inputs controlled (otherwise the updater fn gets stored as `size`,
  // making `size[name]` undefined and flipping the inputs to uncontrolled).
  const handleSize = (next) => {
    setFormData((p) => ({
      ...p,
      size: typeof next === "function" ? next(p.size) : next,
    }));
  };

  const handleQuantity = (val) => {
    if (val === "" || val < 1) return;
    setFormData((p) => ({ ...p, quantity: Number(val) }));
  };

  // Determine which fields to show based on category
  const shouldShowSize = ["Woodwork", "Stationery", "Textiles", "Porcelain"].includes(formData.category);
  const shouldShowMaterial = ["Woodwork", "Accessories", "Stationery", "Textiles"].includes(formData.category);
  const shouldShowColorPalette = ["Woodwork", "Accessories", "Stationery", "Textiles", "Porcelain"].includes(formData.category);

  // Derive the absolute delivery date from `deliveryDays` (null = flexible).
  // Kept as a derived value so the days slider and date stay in sync without
  // a useEffect ping-pong.
  const computedDeliveryDate = (() => {
    if (deliveryDays == null) return "";
    const t = new Date();
    t.setDate(t.getDate() + Number(deliveryDays));
    return t.toISOString().split("T")[0];
  })();

  // Mirror the derived value into formData so the existing validation /
  // submission / persistence code keeps reading `formData.deliveryDate`.
  useEffect(() => {
    setFormData((p) => ({ ...p, deliveryDate: computedDeliveryDate }));
  }, [computedDeliveryDate]);

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

  const onSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) return toast.error(error);

    try {
      setLoading(true);

      const imageDataUrls = await Promise.all(
        images.map((img) => fileToDataURL(img.file)),
      );
      let voiceMemoDataUrl = null;
      if (audioBlob) {
        voiceMemoDataUrl = await blobToDataURL(audioBlob);
      }

      const id = `req_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
      const persistedRequest = {
        id,
        itemName: formData.itemName.trim(),
        description: formData.description.trim(),
        visibility: formData.visibility,
        category: formData.category,
        quantity: formData.quantity,
        material: formData.material || "",
        deliveryDate: formData.deliveryDate || "",
        size: formData.size,
        sizeMode: formData.sizeMode,
        packageSize: formData.packageSize,
        colors,
        images: imageDataUrls,
        voiceMemoDataUrl,
        storeId: selectedStore?.id ?? null,
        store: selectedStore
          ? {
              name: selectedStore.name,
              username: selectedStore.username,
            }
          : null,
        createdAt: new Date().toISOString(),
        ownerUserId: session?.userId ?? null,
        user: session?.userId
          ? { name: session.name, email: session.email }
          : { name: "Guest" },
      };

      addLocalCustomRequest(persistedRequest);
      dispatch(addCustomRequest(persistedRequest));

      const submitData = new FormData();
      submitData.append("itemName", formData.itemName);
      submitData.append("description", formData.description);
      submitData.append("visibility", formData.visibility);
      if (selectedStore) submitData.append("storeId", selectedStore.id);
      if (formData.category) submitData.append("category", formData.category);
      submitData.append("quantity", String(formData.quantity));
      submitData.append("material", formData.material);
      submitData.append("deliveryDate", formData.deliveryDate);
      submitData.append("size", JSON.stringify(formData.size));
      submitData.append("sizeMode", formData.sizeMode);
      submitData.append("packageSize", formData.packageSize);
      submitData.append("colors", JSON.stringify(colors));
      submitData.append("clientRequestId", id);
      images.forEach((img, i) => submitData.append(`image_${i}`, img.file));
      if (audioBlob) submitData.append("voiceMemo", audioBlob, "memo.webm");

      try {
        await fetch("/api/custom-order", {
          method: "POST",
          body: submitData,
        });
      } catch {
        /* Local simulation remains the source of truth */
      }

      toast.success("Custom Request Submitted Successfully!");

      // Reset state then send the buyer to their newly-created request page.
      // Resetting before navigating keeps a clean form if they hit Back.
      setFormData(INITIAL_STATE);
      setImages([]);
      setColors([{ hex: "#000000", description: "" }]);
      setAudioBlob(null);
      setSelectedStore(null);
      setShowAdditionalDetails(false);
      setDeliveryDays(null);

      router.push(`/custom/request-view/${id}`);
    } catch {
      toast.error("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4efe4] py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-600 items-start"
        >
          {/* Main card — required fields */}
          <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-slate-50 flex flex-col overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1c355e]">
                Request <span className="text-[#e67e22]">Custom Order</span>
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Describe your vision with as much detail as possible.
              </p>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
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

              <ImageUploader
                images={images}
                setImages={setImages}
                required
                itemName={formData.itemName}
              />

              <div className="w-full">
                <label htmlFor="description" className="block mb-2 font-medium">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInput}
                  rows={5}
                  placeholder="Describe what you're looking for in detail..."
                  className="border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl resize-none bg-[#faf8f5]"
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-6 flex flex-col gap-6 pb-2">
            {/* Foldable: Additional details — only this region scrolls */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-50 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                aria-expanded={showAdditionalDetails}
                className="flex items-center justify-between w-full p-6 text-left hover:bg-[#fcfbf9] transition-colors"
              >
                <div>
                  <span className="font-semibold text-[#1c355e] block">
                    Additional details
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Optional — voice memo, quantity, size, materials, colors,
                    delivery
                  </span>
                </div>
                {showAdditionalDetails ? (
                  <ChevronUpIcon size={22} className="text-slate-500 shrink-0" />
                ) : (
                  <ChevronDownIcon size={22} className="text-slate-500 shrink-0" />
                )}
              </button>

              {showAdditionalDetails && (
                <div className="card-scrollbar max-h-[min(420px,55vh)] overflow-y-auto overflow-x-hidden border-t border-slate-100 px-6 pb-6 pt-4 space-y-6">
                  <AudioRecorder audioBlob={audioBlob} setAudioBlob={setAudioBlob} />

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

                  {shouldShowSize && (
                    <SizeInput
                      size={formData.size}
                      setSize={handleSize}
                      mode={formData.sizeMode}
                      setMode={(mode) =>
                        setFormData((p) => ({ ...p, sizeMode: mode }))
                      }
                      packageSize={formData.packageSize}
                      setPackageSize={(value) =>
                        setFormData((p) => ({ ...p, packageSize: value }))
                      }
                    />
                  )}

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

                  <ColorPalette
                    colors={colors}
                    setColors={setColors}
                    disabled={!shouldShowColorPalette}
                  />

                  <DeliveryWindowPicker
                    days={deliveryDays}
                    setDays={setDeliveryDays}
                  />
                </div>
              )}
            </div>

            {/* Request visibility + submit */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50">
              <h3 className="text-lg font-bold text-[#1c355e] mb-4">
                Request visibility{" "}
                <span className="text-red-500 text-base font-bold">*</span>
              </h3>

              <fieldset className="w-full border-0 p-0 m-0">
                <div className="grid grid-cols-1 gap-3 mb-5">
                  <label
                    htmlFor="vis-open"
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${formData.visibility === "open" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-[#fcfbf9]"}`}
                  >
                    <input
                      id="vis-open"
                      type="radio"
                      name="visibility"
                      checked={formData.visibility === "open"}
                      onChange={() =>
                        setFormData((p) => ({ ...p, visibility: "open" }))
                      }
                      className="accent-[#2582eb] w-5 h-5 shrink-0"
                    />
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        Open Request
                      </p>
                      <p className="text-xs text-slate-500">
                        Posted to Custom Request Hub (default)
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="vis-private"
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${formData.visibility === "private" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-[#fcfbf9]"}`}
                  >
                    <input
                      id="vis-private"
                      type="radio"
                      name="visibility"
                      checked={formData.visibility === "private"}
                      onChange={() =>
                        setFormData((p) => ({ ...p, visibility: "private" }))
                      }
                      className="accent-[#2582eb] w-5 h-5 shrink-0"
                    />
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        Private Request
                      </p>
                      <p className="text-xs text-slate-500">
                        Sent to a specific artisan
                      </p>
                    </div>
                  </label>
                </div>
              </fieldset>

              {formData.visibility === "private" && (
                <div className="mb-5">
                  <StoreSearch
                    selectedStore={selectedStore}
                    onSelectStore={setSelectedStore}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isSubmitEnabled()}
                className={`w-full bg-[#b64b2b] hover:bg-[#9c4024] text-white font-medium rounded-full py-3.5 shadow-md text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#b64b2b] ${isSubmitEnabled() && !loading ? "hover:shadow-lg active:scale-[0.99]" : ""}`}
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>

              <p className="text-[11px] text-center text-slate-400 mt-3 leading-relaxed">
                Required fields are marked with{" "}
                <span className="text-red-500">*</span> on the main form.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomOrderPage() {
  // useSearchParams reads from the URL; wrapping in Suspense lets Next pre-render
  // the static shell without bailing the whole route.
  return (
    <Suspense fallback={null}>
      <CustomOrderPageInner />
    </Suspense>
  );
}
