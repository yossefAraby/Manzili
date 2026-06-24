import { requireKey } from "./providers";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// OpenAI-compatible chat completion against OpenRouter. This is the PRIMARY provider for
// Manzili's text AI chains (a free Gemma model); the paid providers run only as fallbacks
// after it. Returns the assistant message content as a string. Throws on error/timeout so
// the chain falls through to the next tier.
export async function openrouterChat({
  model = "google/gemma-4-31b-it:free",
  messages,
  temperature = 0.4,
  timeoutMs = 20000,
}) {
  const key = requireKey(process.env.OPENROUTER_API_KEY, "OPENROUTER_API_KEY");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        // OpenRouter recommends these attribution headers (optional).
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://manzili-mis.vercel.app",
        "X-Title": "Manzili",
      },
      body: JSON.stringify({ model, messages, temperature }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`openrouter ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("openrouter returned no content");
    return typeof content === "string" ? content : content.map((p) => p?.text || "").join("");
  } catch (e) {
    if (e?.name === "AbortError") throw new Error(`openrouter timeout after ${timeoutMs}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
