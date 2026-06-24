import { NextResponse } from "next/server";
import { textTiers } from "@/lib/ai/textChain";

// One warm sentence introducing the semantic "describe-it" search results. Kept tiny and
// fail-safe: if no provider is configured/reachable (or the products don't match), we return an
// empty intro and the dropdown just shows the product rows without a blurb.
const SYSTEM =
  "You write ONE short, warm sentence (max 20 words) introducing handmade-marketplace search results " +
  "for an Egyptian shop called Manzili. Capture the vibe, material, or use the shopper's query implies. " +
  "No lists, no prices, no markdown, no surrounding quotes — just the single sentence. " +
  "Reply in the SAME language as the query (Arabic query → Arabic sentence). " +
  "If the listed products clearly do NOT match the query, reply with an empty string.";

function buildUserPrompt({ query, products }) {
  const names = (Array.isArray(products) ? products : [])
    .slice(0, 6)
    .map((p) => `${p?.name || ""}${p?.category ? ` (${p.category})` : ""}`.trim())
    .filter(Boolean);
  return `Shopper searched: "${query}".\nTop matching products:\n- ${names.join("\n- ")}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const query = String(body?.query || "").trim();
    const products = Array.isArray(body?.products) ? body.products : [];
    if (!query || products.length === 0) return NextResponse.json({ intro: "" });

    const tiers = textTiers({ system: SYSTEM, user: buildUserPrompt({ query, products }), temperature: 0.6 });
    let raw = null;
    for (const tier of tiers) {
      try {
        raw = await tier.run();
        if (raw) break;
      } catch (e) {
        console.warn(`[ai/search-intro] ${tier.name} failed:`, e?.message || e);
      }
    }
    const intro = (raw || "").trim().replace(/^["']+|["']+$/g, "").slice(0, 200);
    return NextResponse.json({ intro });
  } catch {
    // Never hard-fail — the search dropdown must still render its products without a blurb.
    return NextResponse.json({ intro: "" });
  }
}
