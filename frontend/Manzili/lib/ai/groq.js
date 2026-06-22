import { requireKey } from "./providers";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// OpenAI-compatible chat completion against Groq. Used as the third text-tier
// fallback after z.ai and Gemini. llama-3.1-8b-instant is cheap and fast.
export async function groqChat({ model = "llama-3.1-8b-instant", messages, temperature = 0.5 }) {
  const key = requireKey(process.env.GROQ_API_KEY, "GROQ_API_KEY");

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`groq ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("groq returned no content");
  return content;
}

// Whisper transcription on Groq. Accepts a Buffer + mimeType (we receive a
// data URL on the route and decode it into a Buffer before calling this).
export async function groqTranscribe({ audioBuffer, mimeType = "audio/webm", model = "whisper-large-v3" }) {
  const key = requireKey(process.env.GROQ_API_KEY, "GROQ_API_KEY");

  const ext = (mimeType.split("/")[1] || "webm").split(";")[0];
  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: mimeType }), `memo.${ext}`);
  form.append("model", model);
  form.append("response_format", "text");

  const res = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`groq transcribe ${res.status}: ${text.slice(0, 200)}`);
  }
  // response_format=text returns the raw string body.
  return (await res.text()).trim();
}
