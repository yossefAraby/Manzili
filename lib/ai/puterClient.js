"use client";

// Lazy client-side wrapper around Puter.js. The script is fetched on first
// use, not on page load, so visitors who never touch AI features pay no cost.
//
// Three modes from the user's perspective (resolved by ensurePuterReady):
//   - "ready"   → script loaded, buyer signed in, calls go through Puter
//   - "skipped" → buyer dismissed the brand modal; we never ask again this
//                 session and the caller should use server fallback
//   - "failed"  → script or sign-in errored; caller should use server fallback
//
// Callers pass an `askConsent` async function that opens the brand modal and
// returns true to proceed with sign-in or false to skip. This keeps modal UI
// out of this module and inside the React tree.

const PUTER_SCRIPT_URL = "https://js.puter.com/v2/";
const SKIP_STORAGE_KEY = "manzili_puter_skipped_v1";

let scriptPromise = null;
let signInPromise = null;

function loadScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.puter) return Promise.resolve(window.puter);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.puter));
      existing.addEventListener("error", () => reject(new Error("puter script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = PUTER_SCRIPT_URL;
    s.async = true;
    s.onload = () => {
      if (window.puter) resolve(window.puter);
      else reject(new Error("puter not on window after load"));
    };
    s.onerror = () => reject(new Error("puter script failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function puterWasSkipped() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SKIP_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSkipped() {
  try {
    sessionStorage.setItem(SKIP_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

// Returns the `puter` global ready to use, or null if the buyer skipped or
// anything failed. Never throws — fallbacks should be transparent.
//
// `passive: true` means "only return Puter if the buyer is already signed in
// from an earlier action; never prompt." Use this for review-type flows that
// shouldn't interrupt the buyer with a sign-in popup. Image generation passes
// passive=false so the popup runs the first time.
export async function ensurePuter({ askConsent, passive = false } = {}) {
  if (typeof window === "undefined") return null;
  if (puterWasSkipped()) return null;

  let puter;
  try {
    puter = await loadScript();
  } catch (e) {
    console.warn("[puter] script load failed:", e?.message || e);
    return null;
  }

  try {
    if (puter.auth?.isSignedIn?.()) return puter;
  } catch {
    /* fall through to consent + signIn */
  }

  if (passive) return null;

  if (typeof askConsent === "function") {
    let proceed = false;
    try {
      proceed = await askConsent();
    } catch {
      proceed = false;
    }
    if (!proceed) {
      markSkipped();
      return null;
    }
  }

  if (!signInPromise) {
    signInPromise = (async () => {
      try {
        await puter.auth.signIn();
        return true;
      } catch (e) {
        console.warn("[puter] sign-in failed:", e?.message || e);
        return false;
      } finally {
        // Allow a fresh attempt next time the user explicitly opts in.
        setTimeout(() => {
          signInPromise = null;
        }, 0);
      }
    })();
  }
  const ok = await signInPromise;
  if (!ok) return null;
  return puter;
}

// Detect "quota exhausted" / payment-required signals so we can fall back to
// the server route instead of erroring up to the user.
export function looksLikeQuotaError(err) {
  const msg = (err?.message || err?.error?.message || String(err || "")).toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("rate") ||
    msg.includes("limit") ||
    msg.includes("permission") ||
    msg.includes("payment") ||
    msg.includes("usage") ||
    msg.includes("insufficient") ||
    msg.includes("upgrade")
  );
}

// ---- Feature wrappers — each returns the Puter result or throws. Callers
// should catch and fall back to the server route on any throw. ----

export async function puterChat(puter, { system, user, temperature = 0.7 }) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });
  const res = await puter.ai.chat(messages, { temperature });
  const text =
    (typeof res === "string" && res) ||
    res?.message?.content ||
    (typeof res?.toString === "function" && res.toString()) ||
    "";
  if (!text) throw new Error("puter chat returned empty");
  return text;
}

export async function puterImage(puter, prompt) {
  const img = await puter.ai.txt2img({ prompt, model: "nano-banana" });
  const src =
    (typeof img === "string" && img) ||
    img?.src ||
    (typeof img?.toString === "function" && img.toString()) ||
    "";
  if (!src.startsWith("data:image/")) {
    throw new Error("puter image returned non-data-url");
  }
  return src;
}

export async function puterTranscribe(puter, audioBlob) {
  const res = await puter.ai.speech2txt(audioBlob, { response_format: "text" });
  const text =
    (typeof res === "string" && res) ||
    res?.text ||
    "";
  if (!text) throw new Error("puter transcribe returned empty");
  return text;
}
