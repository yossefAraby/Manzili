import { requireKey } from "./providers";

const BLUESMINDS_URL = "https://api.bluesminds.com/v1/chat/completions";

// Our most-powerful text provider: BluesMinds (OpenAI-compatible) running
// DeepSeek-V4-Flash. It produces the best handmade-order reasoning, so it sits
// FIRST in every fallback chain — BUT the endpoint is slow/unreliable and its
// chat completions can 504 after ~60s. We therefore wrap each call in a SHORT
// AbortController timeout (default 10s) and let callers fall back to the
// existing providers (z.ai / gemini / groq) on any error or timeout.
const DEFAULT_TIMEOUT_MS = 10_000;

export async function bluesmindsChat({
  model = "DeepSeek-V4-Flash",
  messages,
  temperature = 0.5,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  // Key is read from the env the same way the other providers read theirs.
  // A missing key throws a skippable error so the fallback chain moves on.
  const key = requireKey(process.env.BLUESMINDS_API_KEY, "BLUESMINDS_API_KEY");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BLUESMINDS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages, temperature }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`bluesminds ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("bluesminds returned no content");
    return typeof content === "string"
      ? content
      : content.map((p) => p?.text || "").join("");
  } catch (e) {
    // Normalize the AbortController timeout into a readable message so the
    // caller's fallback log makes sense.
    if (e?.name === "AbortError") {
      throw new Error(`bluesminds timeout after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
