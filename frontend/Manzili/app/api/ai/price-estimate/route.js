import { NextResponse } from "next/server";
import { textTiers } from "@/lib/ai/textChain";

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

// This route runs SERVER-SIDE, so the catalog base MUST be absolute. In production
// NEXT_PUBLIC_API_BASE_URL is the RELATIVE "/api/v1" (a same-origin proxy for the
// browser) — a relative URL can't be fetched server-side. Resolve it against the
// incoming request's origin so the call goes through the same /api/v1 proxy
// (Cloudflare-tunnel-preferred → IP fallback). An already-absolute base (local dev,
// e.g. http://localhost:5080/api/v1) is used as-is.
function resolveCatalogBase(request) {
  const base = API_BASE.replace(/\/$/, "");
  if (/^https?:\/\//i.test(base)) return base;
  const origin = new URL(request.url).origin;
  return `${origin}${base.startsWith("/") ? base : `/${base}`}`;
}

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
async function fetchCatalog(base, path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${base}${path}`, {
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

// Collect comparable items from BOTH the same-category listing (the primary signal)
// and the name search, deduping by product id. We keep each item's name + price (not
// just the price) so we can (a) compute price stats and (b) surface the few items that
// are textually closest to the requested piece — "really checking similar items".
async function gatherComparables({ base, category, itemName }) {
  const seen = new Map(); // id -> { name, price, fromCategory }

  const absorb = (list, fromCategory) => {
    if (!Array.isArray(list)) return;
    for (const dto of list) {
      const id = String(dto?.id ?? "");
      const price = priceFromDto(dto);
      const name = String(dto?.name ?? "");
      if (!id || price <= 0) continue;
      // Prefer the category match when an item shows up in both lists.
      if (!seen.has(id)) seen.set(id, { name, price, fromCategory });
      else if (fromCategory) seen.get(id).fromCategory = true;
    }
  };

  const tasks = [];
  // Same-category listing is the main comparable source — pull a wide slice (cap 100).
  if (category) {
    tasks.push(
      fetchCatalog(base, `/products?category=${encodeURIComponent(category)}&limit=100`).then(
        (j) => absorb(j?.data?.productCards || j?.data?.ProductCards, true),
      ),
    );
  }
  // Name search widens the net to similarly-named items in other categories too.
  if (itemName) {
    tasks.push(
      fetchCatalog(base, `/search?q=${encodeURIComponent(itemName)}&limit=50`).then((j) =>
        absorb(j?.data?.products, false),
      ),
    );
  }
  await Promise.all(tasks);

  const items = [...seen.values()];
  const prices = items.map((i) => i.price).sort((a, b) => a - b);
  const stats =
    prices.length === 0
      ? { count: 0, min: 0, median: 0, max: 0, categoryCount: 0 }
      : {
          count: prices.length,
          min: Math.round(prices[0]),
          median: median(prices),
          max: Math.round(prices[prices.length - 1]),
          categoryCount: items.filter((i) => i.fromCategory).length,
        };
  return { items, stats };
}

// Tokenize a name into meaningful lowercase words (drop tiny stop-ish fragments).
function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

// Rank comparable items by token overlap with the requested item name/description and
// return the closest few as concrete "similar item" examples for the model to anchor on.
function pickSimilar(items, { itemName, description }, n = 5) {
  const wanted = new Set([...tokenize(itemName), ...tokenize(description)]);
  if (wanted.size === 0) return items.slice(0, n);
  const scored = items.map((it) => {
    const toks = tokenize(it.name);
    let overlap = 0;
    for (const w of toks) if (wanted.has(w)) overlap += 1;
    // Category matches get a small boost so same-category items lead when names tie.
    return { ...it, score: overlap + (it.fromCategory ? 0.5 : 0) };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, n)
    .filter((s) => s.score > 0 || s.fromCategory);
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
  "Your MOST IMPORTANT input is the list of REAL comparable items already selling in the SAME category on Manzili (with their actual prices). Anchor your range on those similar items first — they reflect what Egyptian buyers actually pay for this kind of handmade piece. " +
  "Also use the TYPICAL handmade price band for the category as a secondary sanity check. " +
  "Starting from the similar items' prices, adjust UP for: premium/heavy materials (solid wood, leather, metal, gold/silver), larger physical size, finer detail, and made-to-order/bespoke work (a custom one-off costs more than a ready-made equivalent — usually at or above the median of the comparables). Bigger functional pieces (furniture, a desk, a wardrobe) sit near the TOP of the range, not the bottom. " +
  "You quote the TOTAL for the whole order (quantity × per-unit, with a mild bulk discount for large quantities). " +
  "Never produce an unrealistically cheap range for a handmade good (e.g. a wooden desk is never tens of EGP). When the comparables are thin, lean on the category band and widen the range. " +
  "Return ONLY compact JSON: {\"low\": <int EGP>, \"high\": <int EGP>, \"note\": \"<one short, specific sentence of reasoning that references the similar items or category>\"}. " +
  "low must be < high, both positive integers, no currency symbols, no markdown, no extra keys.";

function buildUserPrompt({ details, stats, anchor, large, similar }) {
  const lines = [];
  lines.push(`Requested item: ${details.itemName || "(unspecified)"}`);
  lines.push(`Category: ${details.category || "(unspecified)"}`);
  if (details.description) lines.push(`Description: ${details.description}`);
  if (details.material) lines.push(`Material: ${details.material}`);
  if (details.size) lines.push(`Size: ${typeof details.size === "string" ? details.size : JSON.stringify(details.size)}`);
  lines.push(`Quantity: ${details.quantity || 1}`);
  lines.push("");

  // Concrete similar items lead the prompt — this is the "really check similar items" signal.
  if (Array.isArray(similar) && similar.length > 0) {
    lines.push("Similar items already on Manzili (name — selling price EGP), most relevant first:");
    for (const s of similar) lines.push(`  - ${s.name || "item"} — ${Math.round(s.price)}`);
    lines.push("");
  }

  // Aggregate stats over ALL comparables found (≥2 is enough to be informative here).
  if (stats.count >= 2) {
    lines.push(
      `Across ${stats.count} comparable catalog items (${stats.categoryCount} in the same category): min ${stats.min}, median ${stats.median}, max ${stats.max} EGP. A bespoke made-to-order version usually sits at or above the median.`,
    );
  } else {
    lines.push("Few/no catalog comparables were found — lean on the category band and the item's specifics.");
  }

  lines.push(
    `Typical handmade price band for this category in Egypt: ~${anchor[0]} to ${anchor[1]} EGP per piece (secondary sanity check).`,
  );
  if (large) {
    lines.push("This looks like a LARGE functional piece — price it in the upper part of the range.");
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
      itemName: (body?.itemName || "").trim(),
      category: (body?.category || "").trim(),
      description: (body?.description || "").trim(),
      material: body?.material || "",
      size: body?.size || "",
      quantity: body?.quantity || 1,
    };

    // Category + description are REQUIRED so the estimate can compare against similar
    // items in the same category (not guess blind). The form enforces this too.
    if (!details.itemName || !details.category || !details.description) {
      return NextResponse.json(
        { error: "itemName, category and description are required to estimate a price" },
        { status: 400 },
      );
    }

    // 1) Real same-category comparables (+ name-search), the closest similar examples,
    //    a category price anchor, and a large-piece hint.
    const { items, stats } = await gatherComparables({
      base: resolveCatalogBase(request),
      category: details.category,
      itemName: details.itemName,
    });
    const similar = pickSimilar(items, details, 5);
    const anchor = anchorFor(details.category);
    const large = looksLarge(`${details.itemName} ${details.description}`);

    // 2) AI range anchored on the real similar items first, then the category band.
    const userPrompt = buildUserPrompt({ details, stats, anchor, large, similar });
    // OpenRouter (free Gemma) primary → z.ai / gemini / groq → DeepSeek last (costly).
    const tiers = textTiers({ system: SYSTEM, user: userPrompt, temperature: 0.3 });

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

    // Grounded once we have at least a couple of real comparables to anchor on.
    const grounded = stats.count >= 2;
    return NextResponse.json({
      low: estimate.low,
      high: estimate.high,
      currency: "EGP",
      count: stats.count,
      similarCount: similar.length,
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
