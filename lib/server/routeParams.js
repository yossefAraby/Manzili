/**
 * Next.js 15+ route handlers may receive `params` as a Promise.
 * Always await this before reading dynamic segments.
 */
export async function resolveRouteParams(params) {
    if (params == null) return {};
    return await Promise.resolve(params);
}
