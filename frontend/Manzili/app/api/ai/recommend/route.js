import { NextResponse } from "next/server";
import { textTiers } from "@/lib/ai/textChain";

// AI-powered product recommendations for Manzili, GROUNDED in the real catalog and
// the buyer's own behaviour — not a static "related products" list. Flow:
//   1. Gather a CANDIDATE pool of real products from the .NET catalog (same-category /
//      by the buyer's favourite categories / a search query, depending on `mode`).
//   2. Score each candidate locally for proximity (seller city vs buyer city), taste
//      (categories the buyer engages with), and budget-vs-quality fit — and pre-rank.
//   3. Hand the buyer's signals + the pre-ranked candidates to the AI chain (BluesMinds /
//      DeepSeek primary, then z.ai / gemini / groq) and ask it to pick the best N with a
//      one-line reason each and a short "persona" label, detecting patterns dynamically.
//   4. Return ready-to-render UI product cards (same shape ProductCard consumes) + reason.
// If the AI is unavailable we fall back to the local heuristic ranking, so the rail is
// never empty when the catalog has matching items.

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5080/api/v1";

// Runs SERVER-SIDE, so the catalog base MUST be absolute. In production
// NEXT_PUBLIC_API_BASE_URL is the RELATIVE "/api/v1" (a browser-only proxy) — resolve it
// against the incoming request origin so the call goes through the same /api/v1 proxy.
function resolveCatalogBase(request) {
  const base = API_BASE.replace(/\/$/, "");
  if (/^https?:\/\//i.test(base)) return base;
  const origin = new URL(request.url).origin;
  return `${origin}${base.startsWith("/") ? base : `/${base}`}`;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// The "offer" price only counts as the selling price when it's a real discount.
function sellingPrice(listRaw, offerRaw) {
  const list = Number(listRaw) || 0;
  const offer = Number(offerRaw);
  return Number.isFinite(offer) && offer > 0 && offer < list ? offer : list;
}

// Fetch one catalog URL with a short timeout; null on any error so a flaky backend
// never sinks the recommendations (we still fall back to whatever we gathered).
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

// Collapse either a list-card DTO ({ "main image", "offer price", category:[] }) or a
// search DTO ({ images:[str], category:str }) into one compact candidate shape.
function compact(dto) {
  if (!dto || typeof dto !== "object") return null;
  const id = String(dto.id ?? "");
  if (!id) return null;
  const category = Array.isArray(dto.category)
    ? dto.category[0] || ""
    : String(dto.category || "");
  const image =
    dto["main image"]?.src ||
    dto.mainImage?.src ||
    (Array.isArray(dto.images) ? dto.images[0] : null) ||
    null;
  return {
    id,
    name: String(dto.name || ""),
    category,
    description: String(dto.description || "").slice(0, 160),
    price: sellingPrice(dto.price, dto["offer price"] ?? dto.offerPrice),
    mrp: Number(dto.price) || 0,
    rating: Number(dto.rating) || 0,
    reviews: Number(dto.reviewCount) || 0,
    city: dto.store?.city || null,
    bostaCityId: dto.store?.bostaCityId || null,
    storeName: dto.store?.name || "",
    storeId: dto.store?.id != null ? String(dto.store.id) : null,
    storeUsername: dto.store?.username || null,
    inStock: dto.inStock !== false,
    stock: dto.inStock === false ? 0 : (dto.stock ?? 10),
    image,
  };
}

// Pull cards for a single category (the primary personalization signal).
async function fetchCategory(base, category, limit = 24) {
  if (!category) return [];
  const j = await fetchCatalog(
    base,
    `/products?category=${encodeURIComponent(category)}&limit=${limit}`,
  );
  return (j?.data?.productCards || j?.data?.ProductCards || []).map(compact).filter(Boolean);
}

// Function words to drop when keyword-searching a natural-language query. The backend
// search is a literal name-contains, so a full sentence ("a small gift under 600") rarely
// matches — we search the meaningful tokens instead and let the AI do the semantic match.
const STOP = new Set([
  "the", "and", "for", "with", "under", "over", "want", "need", "some", "any", "that",
  "this", "less", "than", "around", "about", "looking", "please", "find", "show", "give",
  "gift", "something", "anything", "egp", "pound", "pounds", "cheap", "best", "good",
  "nice", "near", "from", "made", "buy", "get", "between", "أريد", "هدية", "رخيص", "حول",
]);
function queryTokens(q) {
  return [...new Set(
    String(q || "")
      .toLowerCase()
      .replace(/[^a-z0-9؀-ۿ\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w)),
  )].slice(0, 4);
}

// Gather the candidate pool for a recommendation request, depending on the mode.
async function gatherCandidates({ base, mode, productId, category, query, signals }) {
  const seen = new Map(); // id -> candidate
  // searchHit marks a candidate that came from a literal keyword search (vs the broad pool),
  // so search mode can fall back to ONLY real matches instead of padding with the catalog.
  const absorb = (arr, searchHit = false) => {
    for (const c of arr) {
      if (!c) continue;
      if (!seen.has(c.id)) seen.set(c.id, { ...c, fromSearchHit: searchHit });
      else if (searchHit) seen.get(c.id).fromSearchHit = true;
    }
  };

  const tasks = [];
  if (mode === "search" && query) {
    // Literal keyword hits boost obvious matches into the pool...
    for (const tk of queryTokens(query))
      tasks.push(
        fetchCatalog(base, `/search?q=${encodeURIComponent(tk)}&limit=20`).then((j) =>
          absorb((j?.data?.products || []).map(compact).filter(Boolean), true),
        ),
      );
    tasks.push(
      fetchCatalog(base, `/search?q=${encodeURIComponent(query)}&limit=20`).then((j) =>
        absorb((j?.data?.products || []).map(compact).filter(Boolean), true),
      ),
    );
    // ...but a broad pool is ALWAYS gathered so the AI can semantically match a
    // conversational query the literal search can't (the whole point of "AI search").
    tasks.push(
      fetchCatalog(base, `/products?limit=40`).then((j) =>
        absorb((j?.data?.productCards || j?.data?.ProductCards || []).map(compact).filter(Boolean)),
      ),
    );
    const top = signals?.categories?.[0]?.name;
    if (top) tasks.push(fetchCategory(base, top, 16).then(absorb));
  } else if (mode === "product") {
    // "You may also like": same category is the strongest signal; pad with latest for diversity.
    if (category) tasks.push(fetchCategory(base, category, 40).then(absorb));
    tasks.push(
      fetchCatalog(base, `/products/latest`).then((j) =>
        absorb((j?.data?.productCards || j?.data?.ProductCards || []).map(compact).filter(Boolean)),
      ),
    );
  } else {
    // home / "For You": the buyer's favourite categories, plus latest + featured for cold-start.
    const cats = (signals?.categories || []).slice(0, 3).map((c) => c.name);
    for (const c of cats) tasks.push(fetchCategory(base, c, 16).then(absorb));
    tasks.push(
      fetchCatalog(base, `/products/latest`).then((j) =>
        absorb((j?.data?.productCards || j?.data?.ProductCards || []).map(compact).filter(Boolean)),
      ),
    );
    tasks.push(
      fetchCatalog(base, `/products/featured`).then((j) =>
        absorb((j?.data?.productCards || j?.data?.ProductCards || []).map(compact).filter(Boolean)),
      ),
    );
    // If the buyer has no history at all, make sure we still have a broad pool.
    if (cats.length === 0)
      tasks.push(
        fetchCatalog(base, `/products?limit=40`).then((j) =>
          absorb((j?.data?.productCards || j?.data?.ProductCards || []).map(compact).filter(Boolean)),
        ),
      );
  }
  await Promise.all(tasks);

  // Drop the item being viewed and anything the buyer already owns / saved / has in cart.
  const exclude = new Set([String(productId || ""), ...(signals?.ownedIds || []).map(String)]);
  return [...seen.values()].filter((c) => !exclude.has(c.id));
}

// Infer how quality-driven (vs budget-driven) the buyer is from their spend, and the
// rough price point they shop at. qualityAffinity ∈ [0,1]: 0 = pure budget, 1 = premium.
function detectPersona(signals) {
  const prices = (signals?.pricePoints || []).map(Number).filter((n) => n > 0);
  const avg =
    signals?.avgPaid ||
    (prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0);
  // ~200 EGP reads as budget, ~1500+ reads as premium for handmade goods.
  const qualityAffinity = avg > 0 ? clamp((avg - 200) / (1500 - 200), 0, 1) : 0.5;
  return { qualityAffinity, center: avg };
}

// Local relevance score — drives both the pre-rank handed to the AI and the fallback.
function scoreCandidate(c, ctx) {
  const { signals, persona, mode, currentCategory, catWeight } = ctx;
  let s = 0;

  // (1) Proximity — same seller city as the buyer is a strong, concrete signal.
  if (signals?.bostaCityId && c.bostaCityId && String(c.bostaCityId) === String(signals.bostaCityId))
    s += 3;
  else if (signals?.city && c.city && norm(c.city) === norm(signals.city)) s += 2.5;

  // (2) Taste — categories the buyer engages with (capped so one category can't dominate).
  s += Math.min(3, catWeight.get(norm(c.category)) || 0);
  if (mode === "product" && currentCategory && norm(c.category) === norm(currentCategory)) s += 2;

  // (3) Budget vs quality — weight rating for quality shoppers, price-fit for budget shoppers.
  const q = persona.qualityAffinity;
  s += (c.rating / 5) * 2 * q;
  if (persona.center > 0) {
    const fit = 1 - Math.min(1, Math.abs(c.price - persona.center) / persona.center);
    s += fit * 2 * (1 - q);
  }

  // (4) Mild popularity tiebreak + stock penalty.
  s += Math.min(1, c.reviews / 10) * 0.5;
  if (c.rating >= 4.5) s += 0.3;
  if (!c.inStock) s -= 2;

  // (5) In search mode, a literal keyword match is the strongest relevance signal.
  if (mode === "search" && c.fromSearchHit) s += 4;
  return s;
}

const SYSTEM =
  "You are the personalization engine for MANZILI, an Egyptian marketplace for HANDMADE products. " +
  "You recommend products to ONE buyer. You are given the buyer's SIGNALS (their city, the categories they engage with, the prices they typically pay) and a CANDIDATE list of REAL products (id, name, category, price in EGP, rating, review count, seller city). " +
  "Pick the BEST products for THIS specific buyer and reason about: " +
  "(1) PROXIMITY — prefer items whose seller city matches or is near the buyer's city (cheaper, faster delivery); " +
  "(2) TASTE — prefer the categories the buyer actually engages with; " +
  "(3) BUDGET vs QUALITY — infer from their price history whether they are budget-conscious (favour good value, fair prices) or quality-driven (favour higher-rated, premium pieces) and match that; " +
  "(4) detect any other pattern in their behaviour dynamically. " +
  "Prefer in-stock items. Pick a varied, non-repetitive set. " +
  'Return ONLY compact JSON: {"persona":"<2-4 word label describing this shopper, e.g. \'quality-focused local\' or \'budget gift shopper\'>","picks":[{"id":"<candidate id>","reason":"<one short, specific sentence on why it fits THIS buyer>"}]}. ' +
  "Use only ids from the candidate list, no duplicates. Follow the count instruction in the request exactly. No markdown, no extra keys.";

function buildUserPrompt({ mode, count, signals, current, query, candidates, persona }) {
  const lines = [];
  if (mode === "search")
    lines.push(
      `Return ONLY the products that genuinely match the search intent below — at most ${count}. ` +
        "Understand the MEANING of the query, not just the exact words: material (wood, cedar, brass, ceramic, leather, fibre), " +
        "function (a table, a seat, storage, a gift, something to hold flowers, something for the wall), style and synonyms. " +
        "For example 'a table of wood' should match a wooden bench or desk; 'something for the wall' should match wall art; " +
        "'a present for my mum' should match an affordable decorative gift. " +
        "It is much better to return FEWER (even just 1) than to include items that don't really fit. " +
        "If NOTHING in the list matches, return an empty picks array.",
    );
  else lines.push(`Recommend EXACTLY ${count} products.`);
  lines.push("");
  lines.push("Buyer signals:");
  lines.push(`- City: ${signals?.city || "unknown"}${signals?.bostaCityId ? ` (geo id ${signals.bostaCityId})` : ""}`);
  const cats = (signals?.categories || []).map((c) => `${c.name}×${c.count}`).join(", ");
  lines.push(`- Engages with categories: ${cats || "none yet (new shopper)"}`);
  if (persona.center > 0)
    lines.push(
      `- Typical spend: ~${Math.round(persona.center)} EGP/item (${persona.qualityAffinity >= 0.6 ? "leans quality/premium" : persona.qualityAffinity <= 0.4 ? "leans budget/value" : "mixed"}).`,
    );
  else lines.push("- Spend history: none yet — infer from category popularity and ratings.");

  if (mode === "product" && current)
    lines.push(
      `\nCurrently viewing: "${current.name}" in ${current.category || "?"} at ${current.price} EGP. Recommend items they would ALSO want (similar or complementary), not the same item.`,
    );
  if (mode === "search" && query) lines.push(`\nSearch intent: "${query}". Recommend the closest matches for this buyer.`);

  lines.push("");
  lines.push("Candidates (id | name | category | price EGP | rating(reviews) | seller city | description):");
  for (const c of candidates) {
    lines.push(
      `- ${c.id} | ${c.name} | ${c.category || "?"} | ${Math.round(c.price)} | ${c.rating}(${c.reviews}) | ${c.city || "?"}${c.inStock ? "" : " | OUT OF STOCK"}${c.description ? ` | ${c.description}` : ""}`,
    );
  }
  lines.push("");
  if (mode === "search")
    lines.push(`Return JSON with persona + only the genuinely matching picks (0 to ${count}).`);
  else lines.push(`Return JSON with persona + exactly ${count} picks (ids from the list above).`);
  return lines.join("\n");
}

// Tolerant JSON parse: strip code fences, grab the first {...} block.
function parsePicks(raw) {
  if (!raw) return null;
  let text = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) text = brace[0];
  try {
    const obj = JSON.parse(text);
    const picks = Array.isArray(obj.picks) ? obj.picks : [];
    return {
      persona: typeof obj.persona === "string" ? obj.persona.trim() : "",
      picks: picks
        .map((p) => ({ id: String(p?.id ?? ""), reason: String(p?.reason ?? "").trim() }))
        .filter((p) => p.id),
    };
  } catch {
    return null;
  }
}

// Build the UI product shape ProductCard consumes (+ a `reason` and `locality`). rating is a
// 1-element array carrying the average so the card's star row reflects the real score.
// locality is "near" (same city/geo as the buyer), "far" (known different city), or null.
function toUiProduct(c, reason, locality) {
  return {
    id: c.id,
    name: c.name,
    description: "",
    price: c.price,
    mrp: c.mrp,
    images: c.image ? [c.image] : [],
    category: c.category,
    storeId: c.storeId,
    store: c.storeId
      ? { id: c.storeId, name: c.storeName, username: c.storeUsername, city: c.city }
      : null,
    inStock: c.inStock,
    stock: c.stock,
    rating: c.reviews > 0 ? [{ rating: c.rating }] : [],
    variants: [],
    reason: reason || "",
    locality: locality || null,
  };
}

// Classify a candidate's distance from the buyer: same Bosta city / same city name → "near";
// a known but different city → "far"; unknown (no buyer city or no seller city) → null.
function localityFor(c, signals) {
  const bc = signals?.bostaCityId;
  const city = signals?.city;
  if (bc && c.bostaCityId && String(c.bostaCityId) === String(bc)) return "near";
  if (city && c.city && norm(c.city) === norm(city)) return "near";
  if ((bc || city) && c.city) return "far";
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const mode = ["home", "product", "search"].includes(body?.mode) ? body.mode : "home";
    const count = clamp(Number(body?.count) || 4, 1, 12);
    const productId = body?.productId ? String(body.productId) : null;
    const category = (body?.category || "").trim();
    const query = (body?.query || "").trim();
    const signals = body?.signals && typeof body.signals === "object" ? body.signals : {};

    if (mode === "search" && query.length < 2)
      return NextResponse.json({ items: [], persona: "", basis: "empty" });

    const base = resolveCatalogBase(request);
    const candidates = await gatherCandidates({ base, mode, productId, category, query, signals });
    if (candidates.length === 0)
      return NextResponse.json({ items: [], persona: "", basis: "empty" });

    // Pre-rank locally, then hand the top slice to the AI (keeps the prompt focused & fast).
    const persona = detectPersona(signals);
    const catWeight = new Map(
      (signals?.categories || []).map((c) => [norm(c.name), Number(c.count) || 0]),
    );
    const ctx = { signals, persona, mode, currentCategory: category, catWeight };
    const ranked = candidates
      .map((c) => ({ c, score: scoreCandidate(c, ctx) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
    const shortlist = ranked.slice(0, 40);
    const byId = new Map(shortlist.map((c) => [c.id, c]));

    // Ask the AI to pick the final set with reasons + a persona label.
    const userPrompt = buildUserPrompt({
      mode,
      count,
      signals,
      current: productId ? { name: body?.currentName || "", category, price: body?.currentPrice || "" } : null,
      query,
      candidates: shortlist,
      persona,
    });
    // OpenRouter (free Gemma) primary → z.ai / gemini / groq → DeepSeek last (costly).
    const tiers = textTiers({ system: SYSTEM, user: userPrompt, temperature: 0.4 });

    let parsed = null;
    for (const tier of tiers) {
      try {
        const raw = await tier.run();
        parsed = parsePicks(raw);
        // Accept only once we have at least one valid in-shortlist pick.
        if (parsed && parsed.picks.some((p) => byId.has(p.id))) break;
        parsed = null;
      } catch (e) {
        console.warn(`[ai/recommend] ${tier.name} failed:`, e?.message || e);
      }
    }

    // Assemble the final ordered set: AI picks first (in order, deduped, validated),
    // then top up from the local ranking so we always return `count` items if available.
    const chosen = [];
    const used = new Set();
    const push = (c, reason) => {
      if (!c || used.has(c.id) || chosen.length >= count) return;
      used.add(c.id);
      chosen.push(toUiProduct(c, reason, localityFor(c, signals)));
    };
    if (mode === "search") {
      // Trust the AI's SEMANTIC picks — it understands meaning/synonyms ("a table of wood"
      // → a wooden bench), so we don't restrict to literal keyword hits. No padding: only
      // genuine matches. If the AI is unavailable, fall back to literal keyword hits so we
      // still return something relevant rather than the whole catalog.
      if (parsed && parsed.picks.length) {
        for (const p of parsed.picks) push(byId.get(p.id), p.reason);
      } else {
        for (const c of ranked) if (c.fromSearchHit) push(c, "");
      }
    } else {
      // Home / product rails should always be full: AI picks first, then top up from ranking.
      if (parsed) for (const p of parsed.picks) push(byId.get(p.id), p.reason);
      for (const c of ranked) push(c, "");
    }

    return NextResponse.json({
      items: chosen,
      persona: parsed?.persona || "",
      basis: parsed ? "ai" : "heuristic",
      count: chosen.length,
    });
  } catch (e) {
    console.error("[ai/recommend]", e);
    // Never hard-fail the rail — let the client just hide an empty section.
    return NextResponse.json({ items: [], persona: "", basis: "error" }, { status: 200 });
  }
}
