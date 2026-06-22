import { NextResponse } from "next/server";
import { bluesmindsChat } from "@/lib/ai/bluesminds";
import { zaiChat } from "@/lib/ai/zai";
import { geminiGenerate, geminiText } from "@/lib/ai/gemini";
import { groqChat } from "@/lib/ai/groq";

// Estimate a sensible price RANGE for a made-to-order handmade item, GROUNDED in
// real catalog data rather than pure model guessing. Flow:
//   1. Pull similar items' prices from the .NET catalog (by category + by name
//      search), extract their selling prices, and compute {count,min,median,max}.
//   2. Hand those REAL stats + the item details to the AI (BluesMinds primary,
//      then z.ai / gemini / groq fallbacks) and ask for a {low,high} EGP range
//      plus one short reasoning sentence.
//   3. Return { low, high, currency:'EGP', count, basis, note }.
// If no similar items are found we still return an AI-only estimate but flag it
// low-confidence so the UI can caveat it.

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5080/api/v1";

// Resolve the selling price from a catalog DTO the same way the products adapter
// does: the "offer" price only counts when it's a real discount (positive and
// below the list price); otherwise the list price is what the item sells for.
function sellingPrice(listRaw, offerRaw) {
  const list = Number(listRaw) || 0;
  const offer = Number(offerRaw);
  return Number.isFinite(offer) && offer > 0 && offer < list ? offer : list;
}

// Catalog responses carry products under a couple of shapes depending on the
// endpoint (search → data.products[], list → data.productCards[]). Pull the
// selling price out of whichever fields are present.
function priceFromDto(dto) {
  if (!dto || typeof dto !== "object") return 0;
  const list = dto.price;
  const offer = dto["offer price"] ?? dto.offerPrice;
  return sellingPrice(list, offer);
}

function median(sorted) {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// Fetch one catalog URL with a short timeout and return the parsed envelope, or
// null on any error/timeout — a missing backend must never sink the estimate.
async function fetchCatalog(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Collect comparable prices from both the category listing and the name search,
// deduping by product id so an item appearing in both isn't double-counted.
async function gatherComparablePrices({ category, itemName }) {
  const seen = new Map(); // id -> price

  const absorb = (list) => {
    if (!Array.isArray(list)) return;
    for (const dto of list) {
      const id = String(dto?.id ?? "");
      const price = priceFromDto(dto);
      if (price > 0 && !seen.has(id)) seen.set(id, price);
    }
  };

  const tasks = [];
  if (category) {
    tasks.push(
      fetchCatalog(`/products?category=${encodeURIComponent(category)}&limit=50`).then(
        (j) => absorb(j?.data?.productCards || j?.data?.ProductCards),
      ),
    );
  }
  if (itemName) {
    tasks.push(
      fetchCatalog(`/search?q=${encodeURIComponent(itemName)}&limit=50`).then((j) =>
        absorb(j?.data?.products),
      ),
    );
  }
  await Promise.all(tasks);

  const prices = [...seen.values()].sort((a, b) => a - b);
  if (prices.length === 0) return { count: 0, min: 0, median: 0, max: 0 };
  return {
    count: prices.length,
    min: Math.round(prices[0]),
    median: median(prices),
    max: Math.round(prices[prices.length - 1]),
  };
}

// Typical price band (EGP) for a HANDMADE, made-to-order piece in Egypt, per
// category. These are deliberately broad real-world anchors so the model never
// "guesses blind" when the catalog has no comparables — it picks a point inside
// the band and adjusts for the specific item, material, size and quantity. They
// also drive a sanity floor that catches absurd lowballs (a handmade desk for
// 50 EGP). Tuned for the Egyptian market, 2026.
const CATEGORY_ANCHORS = {
  "jewelry": [200, 4000],
  "home décor": [300, 6000],
  "home decor": [300, 6000],
  "ceramics & pottery": [150, 3000],
  "woodwork": [800, 18000],          // furniture / desks / large carpentry run high
  "textiles & clothing": [250, 5000],
  "accessories": [150, 2500],
  "bags & leather": [350, 6000],
  "candles & soap": [80, 800],
  "art & paintings": [400, 10000],
  "stationery": [80, 1500],
  "food & sweets": [100, 2000],
  "fragrances & beauty": [120, 1800],
  "crochet & knitting": [150, 3000],
};
const DEFAULT_ANCHOR = [200, 5000];

function anchorFor(category) {
  const key = String(category || "").trim().toLowerCase();
  return CATEGORY_ANCHORS[key] || DEFAULT_ANCHOR;
}

// A "computer desk" should read as a large piece even with no catalog data;
// nudge a few obviously-large keywords toward the top of the band.
const LARGE_KEYWORDS = ["desk", "table", "wardrobe", "cabinet", "bed", "sofa", "couch", "bookshelf", "shelf", "dresser", "door", "window", "chandelier", "dining"];
function looksLarge(text) {
  const t = String(text || "").toLowerCase();
  return LARGE_KEYWORDS.some((k) => t.includes(k));
}

const SYSTEM =
  "You are a pricing expert for MANZILI, an Egyptian marketplace for HANDMADE, made-to-order items, quoting in Egyptian Pounds (EGP), 2026. " +
  "Every item is hand-crafted by an artisan — it is NOT a cheap factory/mass-market product, so price it for skilled labour + materials + the hours of work + small-batch reality. " +
  "You are given a TYPICAL handmade price band for the item's category in Egypt (your primary anchor) and, when available, REAL price stats from comparable catalog items. " +
  "Choose a sensible range INSIDE or around the category band, then adjust UP for: premium/heavy materials (solid wood, leather, metal, gold/silver), large physical size, fine detail, and made-to-order/bespoke work (custom pieces cost more than ready-made). Bigger functional pieces (furniture, a desk, a wardrobe) sit near the TOP of the band, not the bottom. " +
  "You quote the TOTAL for the whole order (quantity × per-unit, with a mild bulk discount for large quantities). " +
  "Never produce an unrealistically cheap range for a handmade good (e.g. a wooden desk is never tens of EGP). When unsure, prefer the middle of the band and widen the range. " +
  "Return ONLY compact JSON: {\"low\": <int EGP>, \"high\": <int EGP>, \"note\": \"<one short, specific sentence of reasoning>\"}. " +
  "low must be < high, both positive integers, no currency symbols, no markdown, no extra keys.";

function buildUserPrompt({ details, stats, anchor, large }) {
  const lines = [];
  lines.push(`Requested item: ${details.itemName || "(unspecified)"}`);
  lines.push(`Category: ${details.category || "(unspecified)"}`);
  if (details.description) lines.push(`Description: ${details.description}`);
  if (details.material) lines.push(`Material: ${details.material}`);
  if (details.size) lines.push(`Size: ${typeof details.size === "string" ? details.size : JSON.stringify(details.size)}`);
  lines.push(`Quantity: ${details.quantity || 1}`);
  lines.push("");
  lines.push(
    `Typical handmade price band for this category in Egypt: ~${anchor[0]} to ${anchor[1]} EGP per piece. Treat this as your main reference.`,
  );
  if (large) {
    lines.push("This looks like a LARGE functional piece — price it in the upper part of the band.");
  }
  // Only trust catalog comparables when there are enough of them; one stray item
  // is noise that would skew the estimate.
  if (stats.count >= 3) {
    lines.push(
      `Real comparable catalog prices (EGP) from ${stats.count} similar items: min ${stats.min}, median ${stats.median}, max ${stats.max}. A bespoke made-to-order version usually sits at or above the median.`,
    );
  } else {
    lines.push("No reliable catalog comparables — rely on the category band and the item's specifics.");
  }
  lines.push("");
  lines.push("Return the JSON object only.");
  return lines.join("\n");
}

// Backstop: pull an obviously-lowballed model answer up to the category band so a
// handmade desk can never come back as "30–120 EGP".
function applyFloor(estimate, anchor, large) {
  const [aLow, aHigh] = anchor;
  let low = estimate.low;
  let high = estimate.high;
  const floor = Math.round(aLow * (large ? 1 : 0.5)); // large pieces floor at the band's low
  if (high < floor) {
    // Whole range is below plausible — replace with a band-based estimate.
    low = floor;
    high = Math.round(large ? aHigh * 0.6 : Math.max(aLow * 1.6, floor * 2));
  }
  low = Math.max(low, floor);
  if (high <= low) high = Math.round(low * 1.4);
  high = Math.min(high, Math.round(aHigh * 1.5)); // don't let it run away past the band
  return { ...estimate, low, high };
}

// Parse the model's JSON object; tolerate code fences and stray prose by
// grabbing the first {...} block.
function parseEstimate(raw) {
  if (!raw) return null;
  let text = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) text = brace[0];
  try {
    const obj = JSON.parse(text);
    const low = Math.round(Number(obj.low));
    const high = Math.round(Number(obj.high));
    if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0) return null;
    return {
      low: Math.min(low, high),
      high: Math.max(low, high),
      note: typeof obj.note === "string" ? obj.note.trim() : "",
    };
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const details = {
      itemName: body?.itemName || "",
      category: body?.category || "",
      description: body?.description || "",
      material: body?.material || "",
      size: body?.size || "",
      quantity: body?.quantity || 1,
    };

    // 1) Real catalog stats + a category price anchor + a large-piece hint.
    const stats = await gatherComparablePrices({
      category: details.category,
      itemName: details.itemName,
    });
    const anchor = anchorFor(details.category);
    const large = looksLarge(`${details.itemName} ${details.description}`);

    // 2) AI range anchored on the category band (and real stats when reliable).
    const userPrompt = buildUserPrompt({ details, stats, anchor, large });
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
            temperature: 0.3,
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
            temperature: 0.3,
          }),
      },
      {
        name: "gemini",
        run: async () => {
          const content = await geminiGenerate({
            model: "gemini-2.5-flash",
            parts: [{ text: `${SYSTEM}\n\n${userPrompt}` }],
            generationConfig: { temperature: 0.3 },
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
            temperature: 0.3,
          }),
      },
    ];

    let estimate = null;
    let lastErr = null;
    for (const tier of tiers) {
      try {
        const raw = await tier.run();
        estimate = parseEstimate(raw);
        if (estimate) break;
      } catch (e) {
        console.warn(`[ai/price-estimate] ${tier.name} failed:`, e?.message || e);
        lastErr = e;
      }
    }
    if (!estimate) throw lastErr || new Error("all price-estimate tiers failed");
    estimate = applyFloor(estimate, anchor, large);

    const grounded = stats.count >= 3;
    return NextResponse.json({
      low: estimate.low,
      high: estimate.high,
      currency: "EGP",
      count: stats.count,
      basis: grounded ? "catalog" : "ai-only",
      lowConfidence: !grounded,
      note: estimate.note || "",
    });
  } catch (e) {
    console.error("[ai/price-estimate]", e);
    return NextResponse.json(
      { error: e.message || "price-estimate failed" },
      { status: 500 },
    );
  }
}
