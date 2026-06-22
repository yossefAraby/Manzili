import { NextResponse } from "next/server";
import { bluesmindsChat } from "@/lib/ai/bluesminds";
import { zaiChat } from "@/lib/ai/zai";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";
import { groqChat } from "@/lib/ai/groq";

const SYSTEM =
  "You write image-generation prompts that depict a single FINISHED, handmade, made-to-order object a buyer is " +
  "commissioning from an Egyptian artisan — a realistic product photo, not concept art or a person using it.\n\n" +
  "From the buyer's request, produce ONE single paragraph (60-110 words) describing the object so a model can render it faithfully:\n" +
  "- Lead with the object and its exact form/shape and proportions (honour any dimensions given).\n" +
  "- Name the real material and its finish/texture (e.g. oiled walnut grain, hand-thrown matte stoneware, hand-stitched veg-tan leather).\n" +
  "- Use the buyer's stated colors precisely; if reference-photo cues or a voice memo are provided, weave their concrete visual details in.\n" +
  "- Specify craft details that read as handmade (visible stitching, throwing marks, brush strokes, joinery) — never mass-produced plastic perfection.\n" +
  "- Close with a clean product-shot setting: soft natural light, neutral or warm artisanal backdrop, shallow depth of field, eye-level.\n" +
  "Do NOT invent features the buyer never mentioned, and do NOT depict text, logos, watermarks, or people. " +
  "Output the prompt only — no markdown, no lists, no preamble.";

function buildUserMessage({
  itemName,
  category,
  description,
  material,
  colors,
  size,
  captions,
  transcript,
}) {
  const lines = [];
  lines.push(`Item: ${itemName || "(unspecified)"}`);
  lines.push(`Category: ${category || "(unspecified)"}`);
  lines.push(`Buyer description: ${description || "(none)"}`);
  if (material) lines.push(`Material hint: ${material}`);
  if (Array.isArray(colors) && colors.length) {
    lines.push(
      `Color palette: ${colors
        .map((c) => `${c.hex}${c.description ? ` for ${c.description}` : ""}`)
        .join(", ")}`,
    );
  }
  if (size && (size.length || size.width || size.height)) {
    lines.push(`Approx size: L${size.length || "?"} x W${size.width || "?"} x H${size.height || "?"} cm`);
  }
  if (Array.isArray(captions) && captions.length) {
    lines.push(`Reference photo cues: ${captions.join(" | ")}`);
  }
  if (transcript) {
    lines.push(`Voice memo (verbatim + intent):\n${transcript}`);
  }
  lines.push("\nReturn the image-generation prompt only.");
  return lines.join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const userMsg = buildUserMessage(body);

    const tiers = [
      {
        name: "bluesminds",
        run: () =>
          bluesmindsChat({
            model: "DeepSeek-V4-Flash",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userMsg },
            ],
            temperature: 0.7,
          }),
      },
      {
        name: "z.ai",
        run: () =>
          zaiChat({
            model: "glm-4.7-flash",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userMsg },
            ],
            temperature: 0.7,
          }),
      },
      {
        name: "gemini",
        run: async () => {
          const content = await geminiGenerate({
            model: "gemini-2.5-flash",
            parts: [{ text: `${SYSTEM}\n\n${userMsg}` }],
            generationConfig: { temperature: 0.7 },
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
              { role: "user", content: userMsg },
            ],
            temperature: 0.7,
          }),
      },
    ];

    let prompt = null;
    let lastErr = null;
    for (const tier of tiers) {
      try {
        prompt = await tier.run();
        if (prompt) break;
      } catch (e) {
        console.warn(`[ai/synth-prompt] ${tier.name} failed:`, e?.message || e);
        lastErr = e;
      }
    }
    if (!prompt) throw lastErr || new Error("all synth-prompt tiers failed");

    return NextResponse.json({ prompt: prompt.trim() });
  } catch (e) {
    console.error("[ai/synth-prompt]", e);
    return NextResponse.json({ error: e.message || "synth-prompt failed" }, { status: 500 });
  }
}
