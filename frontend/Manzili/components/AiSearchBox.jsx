"use client";
import { Sparkles, Loader2, XIcon, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchProductsSemantic, fetchSearchIntro } from "@/lib/api/products";
import { getCurrencySymbol } from "@/lib/currency";
import { useTranslate } from "@/lib/i18n/LocaleContext";

// The one and only search box. It IS the AI search — no toggle, no "plain" mode.
// As you type (≥5 chars) it hits the pgvector semantic endpoint and shows the closest
// matches by MEANING in a dropdown; pressing Enter opens the full /shop results page.
// Used in both the desktop navbar and the mobile expandable bar / drawer so mobile gets
// the exact same AI search.
export default function AiSearchBox({ autoFocus = false, onNavigate, onClose, dropdownAlign = "left" }) {
  const t = useTranslate();
  const router = useRouter();
  const currency = getCurrencySymbol();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false); // dropdown visible (focused/typing)
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [intro, setIntro] = useState("");

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  // Debounced semantic "describe-it" search (instant, ~no tokens via cached embeddings).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 5) {
      setResults([]);
      setIntro("");
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setIntro("");
    const handle = setTimeout(() => {
      searchProductsSemantic(q, 6)
        .then(({ items, mode }) => {
          if (!alive) return;
          setResults(items);
          // Warm one-line blurb ONLY over genuinely-semantic results (never claim AI on the
          // lexical fallback). It streams in after the rows; it never blocks them.
          if (items.length > 0 && mode === "semantic") {
            fetchSearchIntro(q, items).then((i) => { if (alive) setIntro(i); });
          } else {
            setIntro("");
          }
        })
        .catch(() => { if (alive) { setResults([]); setIntro(""); } })
        .finally(() => { if (alive) setLoading(false); });
    }, 800);
    return () => { alive = false; clearTimeout(handle); };
  }, [query]);

  // Outside-click closes the dropdown.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/shop?search=${encodeURIComponent(q)}`);
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={submit}
        className={`flex items-center w-full text-sm gap-2 bg-slate-100 px-4 py-2.5 rounded-full transition-shadow ${
          loading ? "ai-search-active" : "ai-search-on"
        }`}
      >
        <Sparkles size={18} className="text-[#2582eb] shrink-0" />
        <input
          ref={inputRef}
          suppressHydrationWarning
          className="w-full bg-transparent outline-none placeholder-slate-500"
          type="text"
          placeholder={t("searchAi.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          // On mobile, losing focus collapses the search bar back to the icons.
          // Delayed so a tap on a dropdown result (which blurs the input) still
          // navigates first via onNavigate.
          onBlur={onClose ? () => setTimeout(() => onClose(), 150) : undefined}
        />
        {loading ? (
          <Loader2 size={18} className="animate-spin text-[#2582eb] shrink-0" />
        ) : query ? (
          <button
            type="button"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            aria-label={t("navbar.clearSearch")}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <XIcon size={16} />
          </button>
        ) : null}
      </form>

      {showDropdown && (
        <div
          className={`absolute ${
            dropdownAlign === "right" ? "right-0" : "left-0"
          } top-full mt-2 w-full sm:w-80 max-w-[90vw] z-50 bg-white border border-slate-100 shadow-xl rounded-2xl p-3 animate-fade-in`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#2582eb] mb-2">
            <Sparkles size={12} />
            {t("searchAi.poweredBy")}
          </div>

          {!loading && intro && (
            <p className="text-[12px] leading-snug text-slate-600 px-1 pb-2 mb-2 border-b border-slate-100">
              {intro}
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 px-1 py-3">
              <Loader2 size={16} className="animate-spin" />
              {t("searchAi.searching")}
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-96 overflow-y-auto card-scrollbar">
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  onClick={() => { setOpen(false); onNavigate?.(); }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="relative w-12 h-12 shrink-0 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                    {p.images?.[0] && (
                      <Image
                        src={p.images[0]}
                        alt=""
                        width={48}
                        height={48}
                        className="object-contain max-w-full max-h-full"
                        suppressHydrationWarning
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">{p.name}</p>
                    {p.reason ? (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{p.reason}</p>
                    ) : p.store?.city ? (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin size={10} />
                        {p.store.city}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sm text-slate-700 shrink-0">
                    {currency}
                    {p.price}
                  </span>
                </Link>
              ))}
            </div>
          ) : query.trim().length >= 5 ? (
            <p className="text-sm text-slate-500 px-1 py-3">{t("searchAi.noResults")}</p>
          ) : (
            <p className="text-sm text-slate-500 px-1 py-3">{t("searchAi.hint")}</p>
          )}
        </div>
      )}
    </div>
  );
}
