export function mergeProductCatalog(dummyList, storedList) {
    const map = new Map();
    for (const p of dummyList || []) {
        if (p?.id) map.set(p.id, { ...p });
    }
    for (const p of storedList || []) {
        if (!p?.id) continue;
        const prev = map.get(p.id) || {};
        map.set(p.id, { ...prev, ...p });
    }
    return Array.from(map.values());
}
