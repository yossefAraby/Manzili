export function mergeProductCatalog(dummyList, storedList) {
    const map = new Map();
    for (const p of dummyList || []) {
        if (p?.id) map.set(p.id, { ...p });
    }
    for (const p of storedList || []) {
        if (!p?.id) continue;
        const prev = map.get(p.id) || {};
        const merged = { ...prev, ...p };
        if (!merged.storeId && (prev.storeId || prev.store?.id)) {
            merged.storeId = prev.storeId || prev.store?.id;
        }
        if (!merged.store && prev.store) merged.store = prev.store;
        map.set(p.id, merged);
    }
    return Array.from(map.values());
}
