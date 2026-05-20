import { NextResponse } from "next/server";
import { withFallback, stripDataUrlPrefix } from "@/lib/ai/providers";
import { zaiChat } from "@/lib/ai/zai";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";

const PROMPT = (itemName, category) =>
  `Caption this reference image in 1-2 sentences focused on visual style, materials, colors, and mood. ` +
  `Context: the buyer is requesting a custom "${itemName || "item"}" in the "${category || "general"}" category. ` +
  `Output only the caption, no preamble.`;

export async function POST(request) {
  try {
    const { imageDataUrl, itemName, category } = await request.json();
    if (!imageDataUrl) {
      return NextResponse.json({ error: "imageDataUrl required" }, { status: 400 });
    }

    const prompt = PROMPT(itemName, category);

    const caption = await withFallback(
      () =>
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
      async () => {
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
      "describe-image",
    );

    return NextResponse.json({ caption: caption.trim() });
  } catch (e) {
    console.error("[ai/describe-image]", e);
    return NextResponse.json({ error: e.message || "describe failed" }, { status: 500 });
  }
}
