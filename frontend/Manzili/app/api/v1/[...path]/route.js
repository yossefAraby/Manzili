// Resilient API proxy for the .NET backend.
//
// The browser only ever calls this same-origin HTTPS path (`/api/v1/*` on the Vercel
// domain), so there is no mixed-content block and the auth cookies stay first-party.
// Each call is forwarded server-side to the backend, PREFERRING the encrypted Cloudflare
// tunnel and automatically FALLING BACK to the direct origin if the tunnel is down — so
// the backend never appears to "drop" mid-demo, and a logged-in session survives the
// switch (the cookie is bound to the Vercel domain either way).
//
// Configure in Vercel → Project → Settings → Environment Variables:
//   API_TUNNEL_URL    e.g. https://blue-cat-1234.trycloudflare.com   (preferred, encrypted)
//   API_FALLBACK_URL  e.g. http://63.185.144.255                     (direct, plaintext fallback)
// And point the browser at this proxy (instead of the raw backend):
//   NEXT_PUBLIC_API_BASE_URL=/api/v1
//
// A stale/dead API_TUNNEL_URL is harmless: the proxy detects it and uses the fallback,
// so you never have to redeploy just because a quick-tunnel URL changed.

export const runtime = 'nodejs';        // Node runtime: needs to reach a plain-HTTP upstream + getSetCookie()
export const dynamic = 'force-dynamic'; // never cache proxied API responses

const TUNNEL = (process.env.API_TUNNEL_URL || '').replace(/\/$/, '');
const FALLBACK = (process.env.API_FALLBACK_URL || 'http://63.185.144.255').replace(/\/$/, '');

// Gateway-level statuses that mean "this upstream is unreachable" (not "the app said no").
// Cloudflare uses 52x/530 when a tunnel origin is down; 502/503/504 are generic gateway errors.
const DEAD_STATUS = new Set([502, 503, 504, 521, 522, 523, 524, 530]);
const TIMEOUT_MS = 4500;

// Best-effort: once the tunnel fails, skip it briefly so requests don't each eat the timeout.
// Module-level state lives only for a warm serverless instance — that's fine, it's just a hint.
let tunnelDownUntil = 0;

async function forward(base, path, search, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${base}/api/v1/${path}${search}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function handle(req, ctx) {
  const params = await ctx.params;
  const joined = Array.isArray(params?.path) ? params.path.join('/') : String(params?.path ?? '');
  const search = new URL(req.url).search;

  // Build the forwarded request: copy headers (minus hop-by-hop), forward the body for writes.
  const headers = new Headers(req.headers);
  ['host', 'connection', 'content-length', 'accept-encoding'].forEach((h) => headers.delete(h));
  const method = req.method;
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;
  const init = { method, headers, body, redirect: 'manual' };

  // Target order: prefer the (healthy) tunnel, then the direct fallback. If the tunnel was
  // recently seen down, try the fallback first and keep the tunnel only as a last resort.
  const now = Date.now();
  const tunnelHealthy = TUNNEL && now >= tunnelDownUntil;
  const targets = [];
  if (tunnelHealthy) targets.push({ base: TUNNEL, tunnel: true });
  if (FALLBACK) targets.push({ base: FALLBACK, tunnel: false });
  if (TUNNEL && !tunnelHealthy) targets.push({ base: TUNNEL, tunnel: true });

  let upstream = null;
  let usedTunnel = false;
  for (const t of targets) {
    try {
      const res = await forward(t.base, joined, search, init);
      if (DEAD_STATUS.has(res.status)) throw new Error(`upstream ${res.status}`);
      upstream = res;
      usedTunnel = t.tunnel;
      if (t.tunnel) tunnelDownUntil = 0; // tunnel answered → healthy
      break;
    } catch {
      if (t.tunnel) tunnelDownUntil = Date.now() + 30_000; // skip the tunnel for 30s
      // fall through to the next target
    }
  }

  if (!upstream) {
    return new Response(
      JSON.stringify({ success: false, error: { message: 'Backend unreachable', code: 'UPSTREAM_DOWN' } }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }

  // Relay the response: copy headers (minus encoding/hop-by-hop), preserve ALL Set-Cookie
  // so the auth cookies reach the browser as first-party cookies on the Vercel domain.
  const out = new Headers();
  upstream.headers.forEach((v, k) => {
    const key = k.toLowerCase();
    if (['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(key)) return;
    out.set(k, v);
  });
  for (const c of upstream.headers.getSetCookie?.() ?? []) out.append('set-cookie', c);
  out.set('x-manzili-upstream', usedTunnel ? 'tunnel' : 'direct'); // visible in DevTools for the demo

  const buf = Buffer.from(await upstream.arrayBuffer());
  return new Response(buf, { status: upstream.status, headers: out });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
