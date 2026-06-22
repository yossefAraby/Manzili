import { NextResponse } from "next/server";
import { geminiGenerate, geminiInline } from "@/lib/ai/gemini";

// Two-tier server fallback: Gemini Nano Banana → Pollinations default.
// (Puter.js runs client-side ahead of these; this route is only hit after
// Puter is unavailable or the buyer skipped Puter sign-in.)
//
// History of dropped tiers (so we don't re-add them by accident):
//   - ImageRouter: free models require a paid deposit; this key has none.
//   - Pollinations `nanobanana`: gated behind enter.pollinations.ai (HTML
//     landing page, not an API endpoint). Default model works fine.

async function fetchAsDataUrl(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
  const ct = res.headers.get("content-type") || "image/png";
  if (!ct.startsWith("image/")) {
    const text = await res.text().catch(() => "");
    throw new Error(`unexpected content-type ${ct}: ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${ct};base64,${buf.toString("base64")}`;
}

// Tier 1 — Gemini. The image-preview alias was retired; the stable name on
// v1beta is gemini-2.5-flash-image. responseModalities:["IMAGE"] is required
// or the model returns text-only.
async function viaGemini(prompt) {
  const content = await geminiGenerate({
    model: "gemini-2.5-flash-image",
    parts: [{ text: prompt }],
    generationConfig: { responseModalities: ["IMAGE"] },
  });
  const inline = geminiInline(content);
  if (!inline) throw new Error("gemini returned no image data");
  return `data:${inline.mimeType || "image/png"};base64,${inline.data}`;
}

// Tier 2 — Pollinations.ai. The public GET endpoint returns raw image bytes
// for the default model (flux-based). We pass the API key via Authorization
// for higher rate limits; no model param so we don't trip the nanobanana
// host-gate. `safe=true` filters NSFW for our marketplace context.
async function viaPollinations(prompt) {
  const key = process.env.POLLINATIONS_API_KEY;
  const headers = key ? { Authorization: `Bearer ${key}` } : undefined;
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?nologo=true&safe=true`;
  return await fetchAsDataUrl(url, { headers });
}

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const tiers = [
      { name: "gemini", run: () => viaGemini(prompt) },
      { name: "pollinations", run: () => viaPollinations(prompt) },
    ];

    const errors = [];
    for (const tier of tiers) {
      try {
        const imageDataUrl = await tier.run();
        return NextResponse.json({ imageDataUrl, provider: tier.name });
      } catch (e) {
        console.warn(`[ai/generate-image] ${tier.name} failed:`, e?.message || e);
        errors.push(`${tier.name}: ${e?.message || e}`);
      }
    }

    return NextResponse.json(
      { error: `all image providers failed — ${errors.join(" | ")}` },
      { status: 502 },
    );
  } catch (e) {
    console.error("[ai/generate-image]", e);
    return NextResponse.json({ error: e.message || "generate failed" }, { status: 500 });
  }
}
