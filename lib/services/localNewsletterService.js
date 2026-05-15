/**
 * Newsletter subscriptions persisted to localStorage. We piggyback on the same
 * envelope helpers the rest of the app uses so subscribers survive reloads
 * and are easy to spot in DevTools alongside stores, orders, etc.
 */
import {
  STORAGE_VERSION,
  makeEntityId,
} from "@/lib/storage/localStorageEnvelope";

const KEY = "manzili_newsletter_subscribers_v1";

function safeRead() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function safeWrite(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: STORAGE_VERSION, items })
    );
  } catch {
    // Quota / private-mode failures are non-fatal here.
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

export function listSubscribers() {
  return safeRead();
}

/** Returns { ok, alreadySubscribed, subscriber? }. */
export function subscribeEmail(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, error: "INVALID_EMAIL" };
  }
  const list = safeRead();
  if (list.some((s) => s.email === email)) {
    return { ok: true, alreadySubscribed: true };
  }
  const subscriber = {
    id: makeEntityId("nws"),
    email,
    createdAt: new Date().toISOString(),
  };
  safeWrite([...list, subscriber]);
  return { ok: true, alreadySubscribed: false, subscriber };
}
