// Thrown by a provider when it has no API key configured (or is otherwise not
// usable for this request). It is a NORMAL, catchable error — the fallback
// chain treats it like any other failure and moves on to the next provider, so
// an unset key never becomes a fatal "X missing" surfaced to the user. The
// chain only fails if EVERY provider is unconfigured or errors.
export class ProviderSkip extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderSkip";
    this.skip = true;
  }
}

// Helper for providers: throw a skippable error when an env key is unset.
export function requireKey(value, name) {
  if (!value) throw new ProviderSkip(`${name} missing`);
  return value;
}

// Runs `primary`, falls back to `fallback` if it throws or returns null.
// The label is only used for server logs so we can tell which stage degraded.
export async function withFallback(primary, fallback, label) {
  try {
    const out = await primary();
    if (out == null) throw new Error("empty response");
    return out;
  } catch (e) {
    console.warn(`[ai:${label}] primary failed, falling back:`, e?.message || e);
    return await fallback();
  }
}

// Runs an ordered list of provider tiers, skipping any that throw (missing key,
// timeout, outage, empty response) and returning the first non-null result.
// Each tier is { name, run }. Only throws if NONE of the tiers succeed — so a
// chain of [bluesminds, z.ai, gemini, groq] keeps working as long as at least
// one provider is configured and reachable.
export async function runChain(tiers, label) {
  let lastErr = null;
  for (const tier of tiers) {
    try {
      const out = await tier.run();
      if (out != null && out !== "") return out;
      lastErr = new Error(`${tier.name} returned empty`);
    } catch (e) {
      console.warn(`[ai:${label}] ${tier.name} skipped:`, e?.message || e);
      lastErr = e;
    }
  }
  throw lastErr || new Error(`[ai:${label}] no providers configured`);
}

// Strip the `data:<mime>;base64,` prefix that browsers produce on FileReader
// data URLs. Gemini's inlineData.data wants raw base64, no prefix.
export function stripDataUrlPrefix(dataUrl) {
  if (typeof dataUrl !== "string") return { mimeType: "", data: "" };
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return { mimeType: "", data: dataUrl };
  return { mimeType: m[1], data: m[2] };
}
