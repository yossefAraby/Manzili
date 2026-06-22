import { NextResponse } from "next/server";
import { bluesmindsChat } from "@/lib/ai/bluesminds";
import { zaiChat } from "@/lib/ai/zai";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";
import { groqChat } from "@/lib/ai/groq";

// We ask the model for a JSON array so we can render it as bullets without
// regex-splitting prose. Every provider honors "respond with JSON only"
// reliably when the schema is this small.
const SYSTEM =
  "You are an experienced Egyptian artisan taking in a made-to-order request on a handmade marketplace (Manzili). " +
  "A buyer has filled out a custom-order form. Your job: surface the EXACT questions you would have to ask before you " +
  "could quote a price and start making this piece — nothing you already know from the form, nothing generic.\n\n" +
  "Rules:\n" +
  "- Read what the buyer ALREADY wrote and only ask about what is genuinely missing or ambiguous. Never re-ask for a value they gave.\n" +
  "- Each question must be answerable in one short reply and must change how the piece is made, priced, or shipped.\n" +
  "- Prioritise, in order: exact dimensions/scale, material & finish, precise colors (vs the vague palette given), quantity, " +
  "hard deadline, budget ceiling, and use-case/recipient (gift? daily use? wedding? a child?).\n" +
  "- Be concrete and specific to THIS item (e.g. 'For the cedar jewelry box — hinged lid or lift-off, and lined with felt or bare wood?'), " +
  "never filler like 'any other details?' or 'what is your vision?'.\n" +
  "- Egypt-aware: assume EGP pricing, local materials, and Bosta-style shipping sizes; you may ask which governorate if it affects delivery timing.\n" +
  "- 3 to 5 questions max. If the form is already complete enough to quote, return an empty array.\n\n" +
  "Respond ONLY with a JSON array of short question strings — no markdown, no preamble, no numbering. Example: " +
  '["For the walnut box: lift-off lid or brass hinges?", "Should the inside be felt-lined, and in what color?", "Hard deadline, or is 3 weeks fine?"]';

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
        name: "bluesminds",
        run: () =>
          bluesmindsChat({
            model: "DeepSeek-V4-Flash",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
          }),
      },
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
