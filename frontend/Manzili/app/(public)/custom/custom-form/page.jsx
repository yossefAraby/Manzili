"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthBootstrapped } from "@/lib/features/auth/authSlice";
import {
  UploadCloudIcon,
  MicIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  WandSparklesIcon,
  Loader2Icon,
  ExternalLinkIcon,
  ZoomInIcon,
  TagIcon,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { assets, categories } from "@/assets/assets";
import StoreSearch from "@/components/StoreSearch";
import { useTranslate } from '@/lib/i18n/LocaleContext';
import { addCustomRequest } from "@/lib/features/customRequest/customRequestSlice";
import {
  createRequest as apiCreateRequest,
  updateRequest as apiUpdateRequest,
  fetchRequestById as apiFetchRequestById,
  deleteRequest as apiDeleteRequest,
  fileToDataURL,
  blobToDataURL,
} from "@/lib/api/custom";
import {
  ensurePuter,
  puterChat,
  puterImage,
  puterTranscribe,
  looksLikeQuotaError,
} from "@/lib/ai/puterClient";
import { loadDraft, saveDraft, clearDraft } from "@/lib/customDraft";

const CUSTOMIZE_SEED_KEY = "manzili_customize_seed_v1";

// Debounce window for autosaving the in-progress request draft to localStorage.
const DRAFT_AUTOSAVE_MS = 800;

/**
 * Best-effort relative-time label for the draft banner ("2 minutes ago"). Falls
 * back to "a moment ago" for anything sub-minute or unparseable.
 */
function formatRelativeTime(iso) {
  if (!iso) return "a moment ago";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "a moment ago";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "a moment ago";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/**
 * Fetch each seed image URL and turn it into a {file, preview} entry the
 * existing ImageUploader expects. Skips anything that fails to load so a
 * broken URL doesn't sink the whole prefill.
 */
// Parse the model's JSON-array-of-strings response when calling Puter chat
// directly from the client. Mirrors the server-side parser in
// app/api/ai/review/route.js so both paths produce the same shape.
function parseSuggestionsClient(raw) {
  if (!raw) return [];
  const cleaned = String(raw)
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) {
      return arr.filter((s) => typeof s === "string" && s.trim()).slice(0, 8);
    }
  } catch {
    /* fall through to line-split */
  }
  return cleaned
    .split(/\n+/)
    .map((l) => l.replace(/^[-*\d.\s)]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

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

const ImageUploader = ({
  images,
  setImages,
  required = false,
  itemName = "",
  onGenerateAI,
  onInspireEmpty,
  aiGenerating = false,
  flashImages = false,
}) => {
  const t = useTranslate();
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
      toast.error(t('custom.form.maxImages'));
      return;
    }

    const valid = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(t('custom.form.notValidImage', { name: file.name }));
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

  // Lightbox state — clicking a thumbnail opens a full-size preview. Closes
  // on Escape, on backdrop click, or on the close button.
  const [lightboxIdx, setLightboxIdx] = useState(null);
  useEffect(() => {
    if (lightboxIdx == null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxIdx(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIdx]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <label htmlFor="image-upload" className="font-medium">
          {t('custom.form.visualInspiration')} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => (canInspire ? openPinterest() : onInspireEmpty?.())}
            title={
              canInspire
                ? t('custom.form.inspireSearch', { query: trimmedQuery })
                : t('custom.form.inspireDisabled')
            }
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all border-rose-300 bg-gradient-to-b from-rose-50 to-rose-100 text-rose-700 hover:from-rose-100 hover:to-rose-200 hover:shadow-md active:translate-y-px active:shadow-sm"
          >
            <ExternalLinkIcon size={14} />
            {t('custom.form.inspireFromPinterest')}
          </button>
          {onGenerateAI && (
            <button
              type="button"
              onClick={onGenerateAI}
              disabled={aiGenerating || images.length >= 5}
              title={t('custom.form.aiGenerateHint')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                aiGenerating || images.length >= 5
                  ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed shadow-none"
                  : "border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-800 hover:from-amber-100 hover:to-amber-200 hover:shadow-md active:translate-y-px active:shadow-sm"
              }`}
            >
              {aiGenerating ? (
                <Loader2Icon size={14} className="animate-spin" />
              ) : (
                <WandSparklesIcon size={14} />
              )}
              {aiGenerating ? t('custom.form.generating') : t('custom.form.generateWithAI')}
            </button>
          )}
        </div>
      </div>
      <label
        htmlFor="image-upload"
        className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 transition-colors bg-[#faf8f5] ${images.length >= 5 ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"} ${flashImages ? "flash-error" : ""}`}
      >
        <UploadCloudIcon className="text-slate-400 mb-2" size={32} />
        <span className="text-sm text-slate-500">{t('custom.form.uploadPhotos')}</span>
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
              <button
                type="button"
                onClick={() => setLightboxIdx(idx)}
                aria-label={`View image ${idx + 1} larger`}
                className="group relative block rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors"
              >
                <Image
                  src={img.preview}
                  alt={`Upload preview ${idx + 1}`}
                  width={80}
                  height={80}
                  className="object-cover h-20 w-20 transition-transform group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                  <ZoomInIcon
                    size={20}
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
                  />
                </span>
              </button>
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
        <p className="mt-2 text-sm text-red-500">{t('custom.form.error')}</p>
      )}

      {lightboxIdx != null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Close preview"
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
          >
            <XIcon size={22} />
          </button>
          <div
            className="relative max-w-5xl max-h-[88vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIdx].preview}
              alt={`Visual inspiration ${lightboxIdx + 1}`}
              className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ColorPalette = ({ colors, setColors, disabled = false }) => {
  const t = useTranslate();
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
      <label className="block mb-2 font-medium">{t('custom.form.colorPalette')}</label>
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
            placeholder={t('custom.form.colorPlaceholder')}
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
        <PlusIcon size={16} /> {t('custom.form.addColor')}
      </button>
    </div>
  );
};

const AudioRecorder = ({ audioBlob, setAudioBlob }) => {
  const t = useTranslate();
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
        toast.error(t('custom.form.microphoneDenied'));
      }
    }
  };

  return (
    <div className="w-full">
      <label className="block mb-2 font-medium">{t('custom.form.voiceMemo')}</label>
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
              ? t('custom.form.recording')
              : t('custom.form.recordHint')}
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
  const t = useTranslate();
  const handleDimensionChange = (e) => {
    const val = e.target.value;
    setSize((prev) => ({
      ...prev,
      [e.target.name]: val === "" ? "" : Number(val),
    }));
  };

  const tabs = [
    { id: "dimensions", label: t('custom.form.dimensions') },
    { id: "package", label: t('custom.form.shippingSize') },
  ];

  const packageLabels = {
    SMALL: t('custom.form.packageSmall'),
    MEDIUM: t('custom.form.packageMedium'),
    LARGE: t('custom.form.packageLarge'),
    "Light Bulky": t('custom.form.packageLightBulky'),
    "Heavy Bulky": t('custom.form.packageHeavyBulky'),
  };
  const packageHints = {
    SMALL: t('custom.form.packageSmallHint'),
    MEDIUM: t('custom.form.packageMediumHint'),
    LARGE: t('custom.form.packageLargeHint'),
    "Light Bulky": t('custom.form.packageLightBulkyHint'),
    "Heavy Bulky": t('custom.form.packageHeavyBulkyHint'),
  };

  return (
    <div className="w-full">
      <label className="block mb-2 font-medium">{t('custom.form.size')}</label>

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
            { name: "length", placeholder: t('custom.form.length'), aria: "Length (cm)" },
            { name: "width", placeholder: t('custom.form.width'), aria: "Width (cm)" },
            { name: "height", placeholder: t('custom.form.height'), aria: "Height (cm)" },
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
                {t('custom.form.cm')}
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
                <p className="font-medium text-slate-800 text-sm">{packageLabels[opt.value]}</p>
                <p className="text-xs text-slate-500 mt-0.5">{packageHints[opt.value]}</p>
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
  const t = useTranslate();
  const presetLabelMap = {
    "Flexible": t('custom.form.flexible'),
    "1 week": t('custom.form.oneWeek'),
    "2 weeks": t('custom.form.twoWeeks'),
    "1 month": t('custom.form.oneMonth'),
    "2 months": t('custom.form.twoMonths'),
  };
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
      <label className="block mb-2 font-medium">{t('custom.form.deliveryWindow')}</label>

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
              {presetLabelMap[p.label]}
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
            <span className="text-xs text-slate-500">{t('custom.form.days')}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-medium text-[#1c355e]">
            {days == null ? t('custom.form.noDeadline') : relativeLabel}
          </span>
          <span className="text-slate-500">
            {targetLabel ? `Target · ${targetLabel}` : t('custom.form.pickPreset')}
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
  const t = useTranslate();
  const session = useSelector((s) => s.auth.session);
  const bootstrapped = useSelector(selectAuthBootstrapped);

  // Creating a custom request requires an account. Wait for the cookie-session
  // probe, then bounce guests to sign up (preserving the return path).
  useEffect(() => {
    if (bootstrapped && !session?.userId) {
      router.replace("/register?next=/custom/custom-form");
    }
  }, [bootstrapped, session?.userId, router]);
  const searchParams = useSearchParams();
  const customizeId = searchParams.get("customize");
  const editId = searchParams.get("edit");

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

  // ── Pre-saved draft ───────────────────────────────────────────────────────
  // Autosave the buyer's in-progress request to localStorage so it survives a
  // reload, and offer to restore it on a fresh visit. Scoped per user.
  const draftUserId = session?.userId || "guest";
  // The draft offered by the mount banner (null = no banner). Holding it in
  // state lets Restore re-hydrate without re-reading storage.
  const [draftBanner, setDraftBanner] = useState(null);
  // Suppress autosave while we're hydrating from a seed / edit / restore, so we
  // never overwrite a good draft with the half-applied intermediate state.
  const restoringRef = useRef(false);
  // Block the mount banner from appearing when a customize-seed is being applied
  // (the seed effect runs async, so a simple `customizeId` check isn't enough).
  const seedAppliedRef = useRef(false);

  // AI state. `flashFields` briefly tags the names of empty required inputs so
  // the matching elements pulse a red border (1.6s, see .flash-error in
  // globals.css). `aiSuggestions` is [] when the inline panel is hidden.
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [flashFields, setFlashFields] = useState(() => new Set());

  // Price-estimate state: null until the buyer runs an estimate. Holds the
  // grounded {low, high, count, basis, note, lowConfidence} payload from
  // /api/ai/price-estimate so we can render the inline result chip.
  const [priceEstimating, setPriceEstimating] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState(null);

  // Caches keyed by the image's stable `preview` blob URL and the audio blob
  // reference. As long as the user doesn't remove/replace those entries we
  // reuse the caption / transcript across multiple "Generate with AI" clicks
  // — saves vision + audio tokens, which dominate cost.
  const captionCacheRef = useRef(new Map()); // preview -> caption
  const transcriptCacheRef = useRef({ blob: null, transcript: "" });
  // Last synthesized prompt + the signature of the inputs that produced it,
  // so consecutive clicks with no field changes go straight to image gen.
  const promptCacheRef = useRef({ signature: "", prompt: "" });
  // Timestamps of recent image generations (epoch ms). We allow at most 2
  // calls per rolling 60 s — older entries fall off the array.
  const generationTimestampsRef = useRef([]);
  const RATE_LIMIT_COUNT = 2;
  const RATE_LIMIT_WINDOW_MS = 60_000;

  // Puter consent modal — promise-based so it integrates cleanly with the
  // `ensurePuter({ askConsent })` flow. The handler that resolves this promise
  // is stored in a ref so the modal's buttons can call it from outside React's
  // closure.
  const [puterModalOpen, setPuterModalOpen] = useState(false);
  const puterConsentResolveRef = useRef(null);
  const askPuterConsent = () =>
    new Promise((resolve) => {
      puterConsentResolveRef.current = resolve;
      setPuterModalOpen(true);
    });
  const handlePuterConsentDecision = (proceed) => {
    setPuterModalOpen(false);
    const resolve = puterConsentResolveRef.current;
    puterConsentResolveRef.current = null;
    if (resolve) resolve(proceed);
  };

  const flashField = (name) => {
    setFlashFields((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
    setTimeout(() => {
      setFlashFields((prev) => {
        if (!prev.has(name)) return prev;
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }, 1600);
  };

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

      // Mark that a seed is being applied so the draft-restore banner stays
      // hidden and the seeded values aren't immediately autosaved over a draft.
      seedAppliedRef.current = true;
      restoringRef.current = true;

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
      toast.success(t('custom.form.prefilledFromOriginal'));
    } catch {
      /* ignore — leave the form blank */
    } finally {
      // Let autosave resume after this tick so the seeded form starts persisting
      // as a draft (the banner stays suppressed via seedAppliedRef).
      setTimeout(() => {
        restoringRef.current = false;
      }, 0);
    }
    return () => {
      cancelled = true;
    };
  }, [customizeId]);

  // Prefill from an existing request when `?edit=<id>` is present. We read
  // the full stored payload out of localStorage and hydrate every field —
  // images (data URLs → File entries), voice memo, store selection, colors,
  // size mode, delivery window — so the buyer can tweak and resubmit. The
  // submit handler below picks up `editId` to keep the same id + createdAt
  // rather than minting a new record.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    // Edit mode never autosaves (we don't want to clobber a draft with someone
    // else's existing request), but flag the restore guard anyway for safety.
    restoringRef.current = true;
    (async () => {
      try {
        const saved = await apiFetchRequestById(editId);
        if (cancelled) return;
        if (!saved) {
          toast.error(t('custom.form.couldNotFindRequest'));
          return;
        }

        setFormData({
          itemName: saved.itemName || "",
          description: saved.description || "",
          visibility: saved.visibility || "open",
          category: saved.category || "",
          quantity: saved.quantity ?? 1,
          size: saved.size || { length: "", width: "", height: "" },
          sizeMode: saved.sizeMode || "dimensions",
          packageSize: saved.packageSize || "MEDIUM",
          material: saved.material || "",
          deliveryDate: saved.deliveryDate || "",
        });

        if (Array.isArray(saved.colors) && saved.colors.length > 0) {
          setColors(saved.colors);
        }

        if (saved.store) setSelectedStore(saved.store);

        // Derive the days-from-today slider back from the absolute date so the
        // existing UI control reflects what was saved.
        if (saved.deliveryDate) {
          const d = new Date(saved.deliveryDate);
          const diff = Math.round((d - new Date()) / (1000 * 60 * 60 * 24));
          if (Number.isFinite(diff) && diff >= 0) setDeliveryDays(diff);
        }

        // Always expand the additional-details panel in edit mode — the buyer
        // already filled some of these fields, so it's confusing to hide them.
        setShowAdditionalDetails(true);

        // Stored images are URLs / data URLs — fetch round-trips them back
        // through a Blob → File so the existing ImageUploader sees the same
        // shape it expects from a fresh upload.
        hydrateSeedImages(saved.images).then((mapped) => {
          if (!cancelled && mapped.length > 0) setImages(mapped);
        });

        // Voice memo URL → Blob, dropped straight into audioBlob so the
        // existing player + submit pipeline both work unchanged.
        const memoUrl = saved.voiceMemoUrl || saved.voiceMemoDataUrl;
        if (memoUrl) {
          fetch(memoUrl)
            .then((r) => r.blob())
            .then((blob) => {
              if (!cancelled) setAudioBlob(blob);
            })
            .catch(() => {
              /* leave audioBlob null if the URL is malformed */
            });
        }

        toast.success(t('custom.form.loadedRequestEdit'));
      } catch {
        /* ignore — leave the form blank */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  // On a fresh visit (not editing, not applying a customize-seed), surface any
  // saved draft as a dismissible banner. We never auto-apply — the buyer must
  // click Restore. Runs once after mount so the seed effect above has a chance
  // to claim the visit first.
  useEffect(() => {
    if (editId || customizeId || seedAppliedRef.current) return;
    const existing = loadDraft(draftUserId);
    if (existing) setDraftBanner(existing);
    // draftUserId is stable for a given session; intentionally mount-only so the
    // banner doesn't re-pop after the user dismisses it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the serializable slice of the form we persist. Raw File objects and
  // the audio Blob are deliberately omitted (they can't round-trip through JSON
  // and would blow the storage budget); image previews ride along only when
  // they're already small data URLs.
  const buildDraftPayload = () => {
    const imagePreviews = images
      .map((img) => img?.preview)
      .filter((p) => typeof p === "string" && p.startsWith("data:") && p.length < 200_000);
    return {
      itemName: formData.itemName,
      description: formData.description,
      category: formData.category,
      visibility: formData.visibility,
      quantity: formData.quantity,
      material: formData.material,
      size: formData.size,
      sizeMode: formData.sizeMode,
      packageSize: formData.packageSize,
      colors,
      deliveryDays,
      deliveryDate: formData.deliveryDate,
      storeId: selectedStore?.id ?? null,
      imagePreviews,
    };
  };

  // Autosave (debounced). Skipped in edit mode and while restoring/seeding so we
  // never persist a half-hydrated form or clobber a draft we're about to offer.
  useEffect(() => {
    if (editId) return;
    if (restoringRef.current) return;
    const handle = setTimeout(() => {
      saveDraft(draftUserId, buildDraftPayload());
    }, DRAFT_AUTOSAVE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.itemName,
    formData.description,
    formData.category,
    formData.visibility,
    formData.quantity,
    formData.material,
    formData.size,
    formData.sizeMode,
    formData.packageSize,
    formData.deliveryDate,
    deliveryDays,
    colors,
    selectedStore,
    images,
    draftUserId,
    editId,
  ]);

  // Hydrate the form from a persisted draft (text fields + any data-URL image
  // previews). Wrapped in restoringRef so the rehydration doesn't immediately
  // re-trigger autosave with the intermediate state.
  const applyDraft = (draft) => {
    if (!draft) return;
    restoringRef.current = true;
    setFormData((p) => ({
      ...p,
      itemName: draft.itemName ?? p.itemName,
      description: draft.description ?? p.description,
      category: draft.category ?? p.category,
      visibility: draft.visibility ?? p.visibility,
      quantity: draft.quantity ?? p.quantity,
      material: draft.material ?? p.material,
      size: draft.size ?? p.size,
      sizeMode: draft.sizeMode ?? p.sizeMode,
      packageSize: draft.packageSize ?? p.packageSize,
      deliveryDate: draft.deliveryDate ?? p.deliveryDate,
    }));
    if (Array.isArray(draft.colors) && draft.colors.length > 0) {
      setColors(draft.colors);
    }
    if (draft.deliveryDays !== undefined) setDeliveryDays(draft.deliveryDays);
    if (Array.isArray(draft.imagePreviews) && draft.imagePreviews.length > 0) {
      // Persisted previews are data URLs only; we keep them as preview-only
      // entries (no File) so they render in the uploader. They won't be
      // re-submitted unless the buyer re-adds the real image, which is the safe
      // default — we never serialized the underlying File.
      setImages(draft.imagePreviews.map((preview) => ({ file: null, preview })));
    }
    if (draft.storeId == null) setSelectedStore(null);
    // Expand the extra panel so restored optional fields are visible.
    setShowAdditionalDetails(true);
    // Release the guard after this render tick.
    setTimeout(() => {
      restoringRef.current = false;
    }, 0);
  };

  const handleRestoreDraft = () => {
    applyDraft(draftBanner);
    setDraftBanner(null);
    toast.success("Draft restored");
  };

  const handleDiscardDraft = () => {
    clearDraft(draftUserId);
    setDraftBanner(null);
  };

  // Explicit "Save draft" — persists immediately (bypassing the debounce) and
  // confirms with a toast.
  const handleSaveDraft = () => {
    saveDraft(draftUserId, buildDraftPayload());
    toast.success("Draft saved");
  };

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
  const shouldShowSize = ["Woodwork", "Home Décor", "Ceramics & Pottery", "Textiles & Clothing", "Bags & Leather", "Art & Paintings", "Stationery"].includes(formData.category);
  const shouldShowMaterial = ["Woodwork", "Home Décor", "Ceramics & Pottery", "Textiles & Clothing", "Accessories", "Bags & Leather", "Art & Paintings", "Stationery", "Jewelry"].includes(formData.category);
  const shouldShowColorPalette = ["Woodwork", "Home Décor", "Ceramics & Pottery", "Textiles & Clothing", "Accessories", "Bags & Leather", "Candles & Soap", "Art & Paintings", "Crochet & Knitting", "Stationery", "Jewelry"].includes(formData.category);

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

  // AI: review buyer inputs and surface clarification suggestions inline.
  // Keeps the existing toast vocabulary — loading toast dismissed by id so we
  // don't leave a hanging spinner if the request fails.
  const handleAIReview = async () => {
    if (aiReviewing) return;
    setAiReviewing(true);
    const toastId = toast.loading(t('custom.form.reviewingWithAI'));

    const reviewPayload = {
      formData: {
        itemName: formData.itemName,
        category: formData.category,
        description: formData.description,
        material: formData.material,
        quantity: formData.quantity,
        size: formData.size,
        colors,
        deliveryDate: formData.deliveryDate,
      },
    };

    try {
      let list = null;

      // Tier 1: Puter — but only if the buyer is already signed in from a
      // previous image-generation flow. Review never prompts on its own.
      const puter = await ensurePuter({ passive: true });
      if (puter) {
        try {
          const raw = await puterChat(puter, {
            system:
              "You are reviewing a custom-order request for a handmade-goods marketplace. " +
              "Identify the 3-5 most useful clarifications. Respond ONLY with a JSON array of short strings.",
            user: JSON.stringify(reviewPayload.formData),
            temperature: 0.4,
          });
          list = parseSuggestionsClient(raw);
        } catch (e) {
          if (!looksLikeQuotaError(e)) {
            console.warn("[puter review] failed, will fall back:", e?.message || e);
          }
        }
      }

      // Tier 2: server route (z.ai → Gemini).
      if (!list) {
        const res = await fetch("/api/ai/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewPayload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "review failed");
        list = Array.isArray(data.suggestions) ? data.suggestions : [];
      }

      if (list.length === 0) {
        toast.success(t('custom.form.noClarificationsNeeded'), { id: toastId });
      } else {
        setAiSuggestions(list);
        const msg = list.length === 1 ? t('custom.form.suggestionCount', { count: list.length }) : t('custom.form.suggestionsReady', { count: list.length });
        toast.success(msg, { id: toastId });
      }
    } catch (e) {
      toast.error(`AI review failed: ${e.message}`, { id: toastId });
    } finally {
      setAiReviewing(false);
    }
  };

  // AI: estimate a price RANGE grounded in real catalog data. The server route
  // pulls comparable prices from the .NET catalog (by category + name search),
  // computes stats, then asks the AI for a sensible made-to-order range in EGP.
  // We only require an item name to run — category/material/size sharpen it.
  const handlePriceEstimate = async () => {
    if (priceEstimating) return;
    if (!formData.itemName.trim()) {
      flashField("itemName");
      toast(t('custom.form.priceEstimateNeedsItem'));
      return;
    }
    setPriceEstimating(true);
    const toastId = toast.loading(t('custom.form.estimatingPrice'));
    try {
      const res = await fetch("/api/ai/price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: formData.itemName.trim(),
          category: formData.category,
          description: formData.description,
          material: formData.material,
          size: formData.size,
          quantity: formData.quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "price estimate failed");
      setPriceEstimate(data);
      toast.success(t('custom.form.priceEstimateReady'), { id: toastId });
    } catch (e) {
      toast.error(t('custom.form.priceEstimateFailed', { message: e.message }), { id: toastId });
    } finally {
      setPriceEstimating(false);
    }
  };

  // AI: generate a reference image from the buyer's current inputs.
  // Required-field gate matches isSubmitEnabled() so we don't ship a half-empty
  // prompt to the model. Empty fields flash red so the buyer sees what's
  // missing before reading the toast.
  //
  // Caching strategy (saves tokens across repeat clicks):
  //   - captions: keyed by each image's stable `preview` blob URL. Removed
  //     images are evicted; new uploads always re-caption.
  //   - transcript: keyed by audioBlob identity. Re-record => new transcript.
  //   - synthesized prompt: keyed by a signature of every field that feeds
  //     into the prompt. Identical signature => skip the prompt-synthesis call.
  // Rate limit: at most RATE_LIMIT_COUNT successful generations per rolling
  // RATE_LIMIT_WINDOW_MS — prevents accidental spam while a single user is
  // tinkering. We record the timestamp only after the image is in hand so a
  // failure (which still costs the upstream provider) doesn't blow the budget.
  const handleAIGenerate = async () => {
    if (aiGenerating) return;

    const missing = [];
    if (!formData.itemName.trim()) missing.push("itemName");
    if (!formData.category) missing.push("category");
    if (!formData.description.trim()) missing.push("description");
    if (images.length === 0) missing.push("images");
    if (missing.length > 0) {
      missing.forEach(flashField);
      toast(t('custom.form.aiGenerationRequired'));
      return;
    }

    // Rate limit gate — drop any timestamps outside the window, then check.
    const now = Date.now();
    generationTimestampsRef.current = generationTimestampsRef.current.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    );
    if (generationTimestampsRef.current.length >= RATE_LIMIT_COUNT) {
      const oldest = generationTimestampsRef.current[0];
      const waitSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
      toast(t('custom.form.slowDown', { seconds: waitSec }), { icon: "⏱️" });
      return;
    }

    setAiGenerating(true);
    const toastId = toast.loading(t('custom.form.readingImages'));

    // Puter.js is the LAST-RESORT fallback — it requires a sign-in popup, so
    // we only ask the buyer for it after our automated providers have failed.
    // `puterRef` caches the lazily-resolved instance across the 4 stages of
    // this run so we don't re-attempt the consent modal multiple times.
    let puterCached = null;
    let puterAttempted = false;
    const tryPuter = async () => {
      if (puterAttempted) return puterCached;
      puterAttempted = true;
      puterCached = await ensurePuter({ askConsent: askPuterConsent });
      return puterCached;
    };

    try {
      // 1) Captions — reuse cached entries when the same image is still in
      // the list. Evict cache entries for images the buyer has since removed.
      const liveKeys = new Set(images.map((img) => img.preview));
      for (const key of captionCacheRef.current.keys()) {
        if (!liveKeys.has(key)) captionCacheRef.current.delete(key);
      }
      const captionPrompt = (itemName, category) =>
        `Caption this reference image in 1-2 sentences focused on visual style, materials, ` +
        `colors, and mood. Context: the buyer is requesting a custom "${itemName || "item"}" ` +
        `in the "${category || "general"}" category. Output only the caption.`;
      const captions = await Promise.all(
        images.map(async (img) => {
          const cached = captionCacheRef.current.get(img.preview);
          if (cached) return cached;
          const dataUrl = await fileToDataURL(img.file);

          // Primary: server route (z.ai vision → Gemini).
          let caption = null;
          try {
            const r = await fetch("/api/ai/describe-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageDataUrl: dataUrl,
                itemName: formData.itemName,
                category: formData.category,
              }),
            });
            const data = await r.json();
            if (r.ok) caption = data.caption || "";
            else throw new Error(data?.error || `describe ${r.status}`);
          } catch (serverErr) {
            console.warn("[caption] server failed, trying Puter:", serverErr?.message || serverErr);
            const puter = await tryPuter();
            if (puter) {
              try {
                const res = await puter.ai.chat(
                  captionPrompt(formData.itemName, formData.category),
                  dataUrl,
                );
                caption =
                  (typeof res === "string" && res) ||
                  res?.message?.content ||
                  (typeof res?.toString === "function" && res.toString()) ||
                  null;
              } catch (e) {
                console.warn("[puter caption] failed:", e?.message || e);
              }
            }
            // Caption is best-effort within the larger pipeline; falling
            // through with an empty string keeps the rest of the run alive.
            if (!caption) caption = "";
          }
          captionCacheRef.current.set(img.preview, caption);
          return caption;
        }),
      );

      // 2) Transcript — only re-run if the audio blob reference changed.
      let transcript = "";
      if (audioBlob) {
        if (transcriptCacheRef.current.blob === audioBlob) {
          transcript = transcriptCacheRef.current.transcript;
        } else {
          toast.loading(t('custom.form.transcribingVoice'), { id: toastId });
          // Primary: server route (Gemini → Groq Whisper).
          try {
            const audioDataUrl = await blobToDataURL(audioBlob);
            const res = await fetch("/api/ai/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioDataUrl,
                mimeType: audioBlob.type || "audio/webm",
              }),
            });
            const data = await res.json();
            if (res.ok) transcript = data.transcript || "";
            else throw new Error(data?.error || `transcribe ${res.status}`);
          } catch (serverErr) {
            console.warn("[transcribe] server failed, trying Puter:", serverErr?.message || serverErr);
            const puter = await tryPuter();
            if (puter) {
              try {
                transcript = await puterTranscribe(puter, audioBlob);
              } catch (e) {
                console.warn("[puter transcribe] failed:", e?.message || e);
              }
            }
            // Transcription stays best-effort.
          }
          transcriptCacheRef.current = { blob: audioBlob, transcript };
        }
      } else {
        transcriptCacheRef.current = { blob: null, transcript: "" };
      }

      // 3) Prompt synthesis — skip if every input that feeds into it matches
      // the previous successful run. Signature is a deterministic JSON of the
      // exact fields the route uses.
      const promptInputs = {
        itemName: formData.itemName,
        category: formData.category,
        description: formData.description,
        material: formData.material,
        colors,
        size: formData.size,
        captions,
        transcript,
      };
      const signature = JSON.stringify(promptInputs);
      let prompt;
      if (signature === promptCacheRef.current.signature && promptCacheRef.current.prompt) {
        prompt = promptCacheRef.current.prompt;
      } else {
        toast.loading(t('custom.form.craftingPrompt'), { id: toastId });
        // Primary: server route (z.ai → Gemini → Groq).
        try {
          const synthRes = await fetch("/api/ai/synth-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(promptInputs),
          });
          const synthData = await synthRes.json();
          if (synthRes.ok) prompt = synthData.prompt;
          else throw new Error(synthData?.error || `synth ${synthRes.status}`);
        } catch (serverErr) {
          console.warn("[synth-prompt] server failed, trying Puter:", serverErr?.message || serverErr);
          const puter = await tryPuter();
          if (puter) {
            try {
              prompt = await puterChat(puter, {
                system:
                  "You are a prompt engineer for an image-generation model. Given a buyer's " +
                  "handmade-item request, produce ONE single-paragraph image prompt (60-110 words) " +
                  "that vividly describes the finished object: form, materials, finish, colors, " +
                  "mood, lighting, background. No markdown, no preamble.",
                user: JSON.stringify(promptInputs),
                temperature: 0.7,
              });
            } catch (e) {
              console.warn("[puter synth-prompt] failed:", e?.message || e);
            }
          }
          if (!prompt) throw serverErr;
        }
        promptCacheRef.current = { signature, prompt };
      }

      // 4) Image generation — never cached; the buyer always wants a fresh
      // variant when they click again, even with identical inputs.
      toast.loading(t('custom.form.paintingImage'), { id: toastId });
      let imageDataUrl = null;
      // Primary: server route (Gemini → Pollinations).
      try {
        const genRes = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const genData = await genRes.json();
        if (genRes.ok) imageDataUrl = genData.imageDataUrl;
        else throw new Error(genData?.error || `generate ${genRes.status}`);
      } catch (serverErr) {
        console.warn("[image] server failed, trying Puter:", serverErr?.message || serverErr);
        const puter = await tryPuter();
        if (puter) {
          try {
            imageDataUrl = await puterImage(puter, prompt);
          } catch (e) {
            console.warn("[puter image] failed:", e?.message || e);
          }
        }
        if (!imageDataUrl) throw serverErr;
      }

      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], `ai-generated-${Date.now()}.png`, {
        type: blob.type || "image/png",
      });
      setImages((prev) => [
        ...prev,
        { file, preview: URL.createObjectURL(file) },
      ]);

      generationTimestampsRef.current.push(Date.now());
      toast.success(t('custom.form.aiImageAdded'), { id: toastId });
    } catch (e) {
      toast.error(t('custom.form.aiGenerationFailed', { message: e.message }), { id: toastId });
    } finally {
      setAiGenerating(false);
    }
  };

  // Validation
  const validateForm = () => {
    if (!formData.itemName.trim()) return t('custom.form.itemNameRequired');
    if (!formData.description.trim()) return t('custom.form.descriptionRequired');
    if (images.length === 0) return t('custom.form.imagesRequired');
    if (formData.visibility === "private" && !selectedStore) {
      return t('custom.form.selectStoreRequired');
    }
    if (!formData.category) return t('custom.form.categoryRequired');
    if (formData.deliveryDate) {
      const today = new Date().toISOString().split("T")[0];
      if (formData.deliveryDate < today) return t('custom.form.futureDate');
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

    // A custom request is always saved against the signed-in buyer (the API
    // requires a valid token). Guard up-front so a logged-out visitor gets a
    // clear prompt instead of a generic "failed to submit" after a 401.
    if (!session?.userId) {
      toast.error(t('custom.form.signInToSubmit'));
      router.push('/register?next=/custom/custom-form');
      return;
    }

    try {
      setLoading(true);

      // Images + voice memo are still encoded as data URLs and sent in the
      // JSON body (the API accepts inline data URLs this pass). Restored draft
      // entries carry a data-URL `preview` with no File — use that directly.
      const imageDataUrls = await Promise.all(
        images.map((img) =>
          img.file ? fileToDataURL(img.file) : img.preview,
        ),
      );
      let voiceMemoDataUrl = null;
      if (audioBlob) {
        voiceMemoDataUrl = await blobToDataURL(audioBlob);
      }

      // Persist to the .NET API — the single source of truth. A failure here
      // throws and is surfaced by the outer catch (no local fallback).
      let saved;
      if (editId) {
        saved = await apiUpdateRequest(editId, {
          itemName: formData.itemName.trim(),
          description: formData.description.trim(),
          visibility: formData.visibility,
        });
      } else {
        saved = await apiCreateRequest({
          itemName: formData.itemName.trim(),
          description: formData.description.trim(),
          category: formData.category,
          visibility: formData.visibility,
          quantity: formData.quantity,
          size: formData.size,
          material: formData.material || "",
          deliveryDate: formData.deliveryDate || null,
          images: imageDataUrls,
          voiceMemoUrl: voiceMemoDataUrl,
          storeId: selectedStore?.id ?? null,
        });
      }

      const id = saved?.id || editId;

      // Push an immediate, fully-populated entry into the redux list so the
      // buyer sees their request (with images/colors) the instant they land on
      // the listing — the adapted API detail may not echo every field back.
      dispatch(
        addCustomRequest({
          ...(saved || {}),
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
          voiceMemoUrl: voiceMemoDataUrl,
          storeId: selectedStore?.id ?? null,
          store: selectedStore
            ? { id: selectedStore.id, name: selectedStore.name, username: selectedStore.username }
            : saved?.store ?? null,
          createdAt: saved?.createdAt || new Date().toISOString(),
          updatedAt: editId ? new Date().toISOString() : saved?.updatedAt,
          ownerUserId: saved?.ownerUserId ?? session?.userId ?? null,
          user:
            saved?.user ||
            (session?.userId
              ? { name: session.name, email: session.email }
              : { name: "Guest" }),
        }),
      );

      toast.success(
        editId ? t('custom.form.requestUpdated') : t('custom.form.requestSubmitted'),
      );

      // The request is now persisted server-side — drop the local draft so the
      // buyer isn't offered to restore a request they've already submitted.
      clearDraft(draftUserId);

      // Reset state then send the buyer to their newly-created request page.
      // Resetting before navigating keeps a clean form if they hit Back.
      setFormData(INITIAL_STATE);
      setImages([]);
      setColors([{ hex: "#000000", description: "" }]);
      setAudioBlob(null);
      setSelectedStore(null);
      setShowAdditionalDetails(false);
      setDeliveryDays(null);
      setAiSuggestions([]);
      captionCacheRef.current.clear();
      transcriptCacheRef.current = { blob: null, transcript: "" };
      promptCacheRef.current = { signature: "", prompt: "" };

      router.push(id ? `/custom/request-view/${id}` : "/custom");
    } catch (err) {
      // A 401 here means the session expired mid-edit (the client already
      // cleared it). Send the buyer to sign in rather than showing a vague error.
      if (err?.status === 401) {
        toast.error(t('custom.form.signInToSubmit'));
        router.push('/login?next=/custom/custom-form');
      } else {
        // Log the real failure (status + server validation details) so a 400/500
        // isn't silently masked as the generic auth-era error during testing.
        console.warn('[custom-form] submit failed:', err?.status, err?.message, err?.details);
        toast.error(t('custom.form.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Edit mode only: let the owner permanently delete their own request.
  const handleDeleteRequest = async () => {
    if (!editId) return;
    if (typeof window !== "undefined" && !window.confirm(t("custom.form.confirmDeleteRequest"))) return;
    const ok = await apiDeleteRequest(editId);
    if (ok) {
      clearDraft(draftUserId);
      toast.success(t("custom.form.requestDeleted"));
      router.push("/custom");
    } else {
      toast.error(t("custom.form.error"));
    }
  };

  // Guests never see the form — the effect above redirects them to sign up.
  if (!bootstrapped || !session?.userId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400 text-sm">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe4] py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {draftBanner && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <p className="text-sm text-amber-900">
              You have an unsaved draft from{" "}
              <span className="font-semibold">
                {formatRelativeTime(draftBanner.savedAt)}
              </span>
              .
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="inline-flex items-center rounded-lg bg-[#1c355e] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#2582eb]"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                Discard
              </button>
            </div>
          </div>
        )}
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-600 items-start"
        >
          {/* Main card — required fields */}
          <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-slate-50 flex flex-col overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-slate-100 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1c355e]">
                  {t('custom.form.request')} <span className="text-[#e67e22]">{t('custom.form.customOrder')}</span>
                </h1>
                {editId && (
                  <button
                    type="button"
                    onClick={handleDeleteRequest}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2Icon size={14} />
                    {t('custom.form.deleteRequest')}
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {t('custom.form.describeVision')}
              </p>
            </div>
            <div className="p-6 lg:p-8 space-y-6">
              <div className="w-full">
                <label htmlFor="itemName" className="block mb-2 font-medium">
                  {t('custom.form.itemName')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="itemName"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleInput}
                  type="text"
                  placeholder={t('custom.form.itemNamePlaceholder')}
                  className={`border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl bg-[#faf8f5] ${flashFields.has("itemName") ? "flash-error" : ""}`}
                />
              </div>

              <div className="w-full">
                <label htmlFor="category" className="block mb-2 font-medium">
                  {t('custom.form.category')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInput}
                    className={`border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 pr-10 rounded-xl bg-[#faf8f5] appearance-none cursor-pointer ${flashFields.has("category") ? "flash-error" : ""}`}
                  >
                    <option value="">{t('custom.form.categoryPlaceholder')}</option>
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
                onGenerateAI={handleAIGenerate}
                onInspireEmpty={() => flashField("itemName")}
                aiGenerating={aiGenerating}
                flashImages={flashFields.has("images")}
              />

              <div className="w-full">
                <label htmlFor="description" className="block mb-2 font-medium">
                  {t('custom.form.description')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInput}
                  rows={5}
                  placeholder={t('custom.form.descriptionPlaceholder')}
                  className={`border border-slate-300 outline-none focus:ring-2 focus:ring-[#e67e22] w-full p-3 rounded-xl resize-none bg-[#faf8f5] ${flashFields.has("description") ? "flash-error" : ""}`}
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
                    {t('custom.form.additionalDetails')}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    {t('custom.form.additionalHint')}
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
                    <label className="block mb-2 font-medium">{t('custom.form.quantity')}</label>
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
                        {t('custom.form.material')}
                      </label>
                      <input
                        id="material"
                        name="material"
                        value={formData.material}
                        onChange={handleInput}
                        type="text"
                        placeholder={t('custom.form.materialPlaceholder')}
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
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <h3 className="text-lg font-bold text-[#1c355e]">
                  {t('custom.form.requestVisibility')}{" "}
                  <span className="text-red-500 text-base font-bold">*</span>
                </h3>
                {/* AI actions live together in one row: estimate a price range
                    and review the request for missing details. */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePriceEstimate}
                    disabled={priceEstimating}
                    title={t('custom.form.priceEstimateHint')}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                      priceEstimating
                        ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed shadow-none"
                        : "border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-800 hover:from-emerald-100 hover:to-emerald-200 hover:shadow-md active:translate-y-px active:shadow-sm"
                    }`}
                  >
                    {priceEstimating ? (
                      <Loader2Icon size={14} className="animate-spin" />
                    ) : (
                      <TagIcon size={14} />
                    )}
                    {priceEstimating
                      ? t('custom.form.estimating')
                      : t('custom.form.estimatePriceRange')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAIReview}
                    disabled={aiReviewing}
                    title={t('custom.form.aiReviewHint')}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                      aiReviewing
                        ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed shadow-none"
                        : "border-blue-300 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-800 hover:from-blue-100 hover:to-blue-200 hover:shadow-md active:translate-y-px active:shadow-sm"
                    }`}
                  >
                    {aiReviewing ? (
                      <Loader2Icon size={14} className="animate-spin" />
                    ) : (
                      <SparklesIcon size={14} />
                    )}
                    {aiReviewing ? t('custom.form.reviewing') : t('custom.form.reviewWithAI')}
                  </button>
                </div>
              </div>

              <fieldset className="w-full border-0 p-0 m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <label
                    htmlFor="vis-open"
                    className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${formData.visibility === "open" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-[#fcfbf9]"}`}
                  >
                    <input
                      id="vis-open"
                      type="radio"
                      name="visibility"
                      checked={formData.visibility === "open"}
                      onChange={() =>
                        setFormData((p) => ({ ...p, visibility: "open" }))
                      }
                      className="accent-[#2582eb] w-5 h-5 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {t('custom.form.openRequest')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('custom.form.openRequestHint')}
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="vis-private"
                    className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${formData.visibility === "private" ? "border-[#2582eb] bg-blue-50" : "border-slate-200 bg-[#fcfbf9]"}`}
                  >
                    <input
                      id="vis-private"
                      type="radio"
                      name="visibility"
                      checked={formData.visibility === "private"}
                      onChange={() =>
                        setFormData((p) => ({ ...p, visibility: "private" }))
                      }
                      className="accent-[#2582eb] w-5 h-5 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {t('custom.form.privateRequest')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('custom.form.privateRequestHint')}
                      </p>
                    </div>
                  </label>
                </div>
              </fieldset>

              {aiSuggestions.length > 0 && (
                <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1c355e]">
                      <SparklesIcon size={16} className="text-blue-600" />
                      {t('custom.form.aiSuggestions')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiSuggestions([])}
                      aria-label="Dismiss AI suggestions"
                      className="p-1 rounded-md text-slate-400 hover:bg-blue-100 hover:text-slate-600"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                    {aiSuggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {priceEstimate && (
                <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1c355e]">
                      <TagIcon size={16} className="text-emerald-600" />
                      {t('custom.form.estimatedPrice')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPriceEstimate(null)}
                      aria-label="Dismiss price estimate"
                      className="p-1 rounded-md text-slate-400 hover:bg-emerald-100 hover:text-slate-600"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                  <p className="text-lg font-bold text-emerald-700">
                    EGP {Number(priceEstimate.low).toLocaleString()}–{Number(priceEstimate.high).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {priceEstimate.count > 0
                      ? t('custom.form.priceBasedOn', { count: priceEstimate.count })
                      : t('custom.form.priceLowConfidence')}
                  </p>
                  {priceEstimate.note && (
                    <p className="mt-2 text-sm text-slate-700">{priceEstimate.note}</p>
                  )}
                </div>
              )}

              {formData.visibility === "private" && (
                <div className="mb-5">
                  <StoreSearch
                    selectedStore={selectedStore}
                    onSelectStore={setSelectedStore}
                  />
                </div>
              )}

              {!editId && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="w-full mb-3 border border-slate-300 bg-white text-[#1c355e] font-medium rounded-full py-3 shadow-sm transition-all hover:bg-[#faf8f5] hover:shadow-md active:scale-[0.99]"
                >
                  Save draft
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !isSubmitEnabled()}
                className={`w-full bg-[#b64b2b] hover:bg-[#9c4024] text-white font-medium rounded-full py-3.5 shadow-md text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#b64b2b] ${isSubmitEnabled() && !loading ? "hover:shadow-lg active:scale-[0.99]" : ""}`}
              >
                {loading
                  ? t('common.loading')
                  : editId
                    ? t('common.submit')
                    : t('custom.form.submit')}
              </button>

              <p className="text-[11px] text-center text-slate-400 mt-3 leading-relaxed">
                {t('custom.form.requiredFieldsBegin')}<span class="text-red-500">*</span>{t('custom.form.requiredFieldsEnd')}
              </p>
            </div>
          </div>
        </form>
      </div>

      {puterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="puter-modal-title"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-[#faf8f5] flex items-center justify-center overflow-hidden">
              <Image
                src={assets.logo}
                alt="Manzili"
                width={56}
                height={56}
                className="object-contain"
              />
            </div>
            <h2 id="puter-modal-title" className="text-xl font-bold text-[#1c355e] mb-2">
              {t('custom.form.unlockAI')}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {t('custom.form.unlockAIDesc')}
            </p>
            <div className="flex flex-col sm:flex-row-reverse gap-2">
              <button
                type="button"
                onClick={() => handlePuterConsentDecision(true)}
                className="flex-1 bg-[#b64b2b] hover:bg-[#9c4024] text-white font-medium rounded-full py-3 shadow-md transition-all"
              >
                {t('custom.form.continue')}
              </button>
              <button
                type="button"
                onClick={() => handlePuterConsentDecision(false)}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-medium rounded-full py-3 transition-colors"
              >
                {t('custom.form.skipForNow')}
              </button>
            </div>
          </div>
        </div>
      )}
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
