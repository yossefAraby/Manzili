/**
 * Pre-saved draft storage for the custom-order request form.
 *
 * A buyer's in-progress request is persisted to localStorage so it survives a
 * reload and can be explicitly saved / restored. The draft is scoped per user
 * (falling back to a shared "guest" bucket when signed out) so two accounts on
 * the same machine never see each other's work.
 *
 * Only serializable text fields are stored here — raw File objects and audio
 * Blobs are deliberately skipped by the caller (see page.jsx) since they can't
 * round-trip through JSON and would blow the ~5MB localStorage budget. Image
 * previews are persisted only when they're already small data URLs.
 *
 * Every access is SSR-safe (guards `window`) and wrapped in try/catch so a
 * disabled / full localStorage can never break the form.
 */

const DRAFT_KEY_PREFIX = "manzili_custom_draft_v1:";

function draftKey(userId) {
  return `${DRAFT_KEY_PREFIX}${userId || "guest"}`;
}

/**
 * Read the saved draft for a user. Returns the parsed object (which includes a
 * `savedAt` ISO timestamp added by saveDraft) or null when there's nothing
 * usable.
 */
export function loadDraft(userId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persist a draft for a user. Stamps `savedAt` so the restore banner can show a
 * relative time. Silently no-ops if serialization or storage fails.
 */
export function saveDraft(userId, data) {
  if (typeof window === "undefined") return;
  try {
    const payload = { ...data, savedAt: new Date().toISOString() };
    window.localStorage.setItem(draftKey(userId), JSON.stringify(payload));
  } catch {
    /* storage full / unavailable — drafts are best-effort */
  }
}

/** Remove the saved draft for a user. */
export function clearDraft(userId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {
    /* ignore */
  }
}
