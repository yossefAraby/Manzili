export function getBostaBaseUrl() {
    const raw = process.env.BOSTA_BASE_URL || 'https://app.bosta.co/api/v2/';
    return raw.endsWith('/') ? raw : `${raw}/`;
}

export function getBostaAuthorizationHeader() {
    const auth = process.env.BOSTA_AUTHORIZATION;
    if (auth && auth.trim()) return auth.trim();

    // Convenience fallback: allow setting raw API key and optional scheme.
    const apiKey = process.env.BOSTA_API_KEY;
    if (!apiKey || !apiKey.trim()) return null;
    const scheme = process.env.BOSTA_AUTH_SCHEME;
    if (scheme && scheme.trim()) return `${scheme.trim()} ${apiKey.trim()}`;
    return apiKey.trim();
}

export class BostaError extends Error {
    constructor(message, { status, details } = {}) {
        super(message);
        this.name = 'BostaError';
        this.status = status;
        this.details = details;
    }
}

async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

export async function bostaFetch(path, { method = 'GET', query, body } = {}) {
    const baseUrl = getBostaBaseUrl();
    const url = new URL(path.replace(/^\//, ''), baseUrl);
    if (query && typeof query === 'object') {
        for (const [k, v] of Object.entries(query)) {
            if (v === undefined || v === null) continue;
            url.searchParams.set(k, String(v));
        }
    }

    const headers = {
        'Content-Type': 'application/json',
    };
    const auth = getBostaAuthorizationHeader();
    if (auth) headers.Authorization = auth;

    const maxAttempts = 3;
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetch(url.toString(), {
                method,
                headers,
                body: body == null ? undefined : JSON.stringify(body),
                cache: 'no-store',
            });
            const text = await res.text();
            let json = null;
            try {
                json = text ? JSON.parse(text) : null;
            } catch {
                json = null;
            }
            if (!res.ok) {
                throw new BostaError(`Bosta API error ${res.status}`, {
                    status: res.status,
                    details: json || text,
                });
            }
            return json;
        } catch (e) {
            lastErr = e;
            const retryable = e?.status >= 500 || e?.name === 'TypeError';
            if (attempt < maxAttempts && retryable) {
                await sleep(250 * attempt);
                continue;
            }
            throw lastErr;
        }
    }
}

