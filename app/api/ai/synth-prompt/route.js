import { NextResponse } from "next/server";
import { zaiChat } from "@/lib/ai/zai";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";
import { groqChat } from "@/lib/ai/groq";

const SYSTEM =
  "You are a prompt engineer for an image-generation model. Given a buyer's handmade-item request, " +
  "produce ONE single-paragraph image prompt (60-110 words) that vividly describes the finished object: " +
  "form, materials, finish, colors, mood, lighting, background. Speak in concrete visual terms. " +
  "Do not use markdown, lists, or preambles. Just the prompt sentence(s).";

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
