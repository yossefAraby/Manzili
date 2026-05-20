const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions";

// OpenAI-compatible chat completion against z.ai. `messages` follows the
// OpenAI multi-modal shape — for vision, pass a content array of
// {type:'text'} / {type:'image_url', image_url:{url}} parts.
export async function zaiChat({ model, messages, temperature = 0.7 }) {
  const key = process.env.ZAI_API_KEY;
  if (!key) throw new Error("ZAI_API_KEY missing");

  const res = await fetch(ZAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`z.ai ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("z.ai returned no content");
  return typeof content === "string"
    ? content
    : content.map((p) => p?.text || "").join("");
}
