import { NextResponse } from "next/server";
import { runChain, stripDataUrlPrefix } from "@/lib/ai/providers";
import { zaiChat } from "@/lib/ai/zai";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";

const PROMPT = (itemName, category) =>
  `You are helping an Egyptian artisan understand a buyer's reference photo for a custom "${itemName || "item"}" ` +
  `in the "${category || "general"}" category. In 1-2 tight sentences, describe ONLY what an artisan needs to replicate ` +
  `the look: the object's form/shape, the material and finish it appears to be, the dominant colors, and any standout ` +
  `craft detail (stitching, carving, glaze, weave, hardware). Skip background, people, and mood adjectives. ` +
  `Be concrete and specific; if a detail is ambiguous in the photo, say so briefly. Output only the caption, no preamble.`;

export async function POST(request) {
  try {
    const { imageDataUrl, itemName, category } = await request.json();
    if (!imageDataUrl) {
      return NextResponse.json({ error: "imageDataUrl required" }, { status: 400 });
    }

    const prompt = PROMPT(itemName, category);

    // Vision chain: z.ai vision primary, Gemini vision fallback. Each tier
    // self-skips when its key is unset, so describe only fails if NEITHER
    // vision provider is configured.
    const caption = await runChain(
      [
        {
          name: "z.ai",
          run: () =>
            zaiChat({
              model: "glm-4.6v-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: imageDataUrl } },
                  ],
                },
              ],
            }),
        },
        {
          name: "gemini",
          run: async () => {
            const { mimeType, data } = stripDataUrlPrefix(imageDataUrl);
            const content = await geminiGenerate({
              model: "gemini-2.5-flash",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType || "image/jpeg", data } },
              ],
            });
            return geminiText(content);
          },
        },
      ],
      "describe-image",
    );

    return NextResponse.json({ caption: caption.trim() });
  } catch (e) {
    console.error("[ai/describe-image]", e);
    return NextResponse.json({ error: e.message || "describe failed" }, { status: 500 });
  }
}
