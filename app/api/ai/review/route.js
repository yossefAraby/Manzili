import { NextResponse } from "next/server";
import { zaiChat } from "@/lib/ai/zai";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";
import { groqChat } from "@/lib/ai/groq";

// We ask the model for a JSON array so we can render it as bullets without
// regex-splitting prose. Both providers honor "respond with JSON only" reliably
// when the schema is this small.
const SYSTEM =
  "You are reviewing a custom-order request a buyer is about to send to a handmade-goods artisan. " +
  "Identify the 3-5 most useful clarifications that would help the artisan quote and build the item accurately. " +
  "Be specific to the fields the buyer already wrote — don't generic-prompt. " +
  "Respond ONLY with a JSON array of short strings, no markdown, no preamble. Example: " +
  '["Specify the wood species (oak vs walnut?)", "What finish: matte, satin, or glossy?"]';

function buildUserPrompt({ formData, captions }) {
  const lines = [];
  lines.push(`Item name: ${formData?.itemName || "(blank)"}`);
  lines.push(`Category: ${formData?.category || "(blank)"}`);
  lines.push(`Description: ${formData?.description || "(blank)"}`);
  if (formData?.material) lines.push(`Material: ${formData.material}`);
  if (formData?.quantity) lines.push(`Quantity: ${formData.quantity}`);
  if (formData?.size) lines.push(`Size: ${JSON.stringify(formData.size)}`);
  if (formData?.colors?.length) {
    lines.push(`Colors: ${formData.colors.map((c) => `${c.hex} (${c.description || "unspecified"})`).join(", ")}`);
  }
  if (formData?.deliveryDate) lines.push(`Delivery date: ${formData.deliveryDate}`);
  if (Array.isArray(captions) && captions.length) {
    lines.push(`Reference image captions: ${captions.join(" | ")}`);
  }
  return lines.join("\n");
}

function parseSuggestions(raw) {
  if (!raw) return [];
  // Models occasionally wrap JSON in ```json fences. Strip them.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) return arr.filter((s) => typeof s === "string" && s.trim()).slice(0, 8);
  } catch {
    /* fall through to line-split */
  }
  return cleaned
    .split(/\n+/)
    .map((l) => l.replace(/^[-*\d.\s)]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const userPrompt = buildUserPrompt(body);

    const tiers = [
      {
        name: "z.ai",
        run: () =>
          zaiChat({
            model: "glm-4.7-flash",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
          }),
      },
      {
        name: "gemini",
        run: async () => {
          const content = await geminiGenerate({
            model: "gemini-2.5-flash",
            parts: [{ text: `${SYSTEM}\n\n${userPrompt}` }],
            generationConfig: { temperature: 0.4 },
          });
          return geminiText(content);
        },
      },
      {
        name: "groq",
        run: () =>
          groqChat({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
          }),
      },
    ];

    let raw = null;
    let lastErr = null;
    for (const tier of tiers) {
      try {
        raw = await tier.run();
        if (raw) break;
      } catch (e) {
        console.warn(`[ai/review] ${tier.name} failed:`, e?.message || e);
        lastErr = e;
      }
    }
    if (!raw) throw lastErr || new Error("all review tiers failed");

    return NextResponse.json({ suggestions: parseSuggestions(raw) });
  } catch (e) {
    console.error("[ai/review]", e);
    return NextResponse.json({ error: e.message || "review failed" }, { status: 500 });
  }
}
