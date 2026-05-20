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

// Strip the `data:<mime>;base64,` prefix that browsers produce on FileReader
// data URLs. Gemini's inlineData.data wants raw base64, no prefix.
export function stripDataUrlPrefix(dataUrl) {
  if (typeof dataUrl !== "string") return { mimeType: "", data: "" };
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return { mimeType: "", data: dataUrl };
  return { mimeType: m[1], data: m[2] };
}
