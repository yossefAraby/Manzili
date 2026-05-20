const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Calls Gemini's generateContent and returns the raw `candidates[0].content`.
// Callers extract whichever parts they need (text vs inlineData).
export async function geminiGenerate({ model, parts, generationConfig }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const body = {
    contents: [{ role: "user", parts }],
    ...(generationConfig ? { generationConfig } : {}),
  };

  const res = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.candidates?.[0]?.content;
  if (!content) throw new Error("gemini returned no candidate");
  return content;
}

// Convenience: extract the first text part from a Gemini response.
export function geminiText(content) {
  const parts = content?.parts || [];
  return parts.map((p) => p?.text || "").join("").trim();
}

// Convenience: extract the first inlineData (image/audio) part.
export function geminiInline(content) {
  const parts = content?.parts || [];
  for (const p of parts) {
    if (p?.inlineData?.data) return p.inlineData; // { mimeType, data }
  }
  return null;
}
