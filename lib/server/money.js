export function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function safeNumber(n, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
}

