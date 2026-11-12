/*
 * STUB: stands in for the two modules denormalize-page-path.ts imports in Next.js:
 * normalizePathSep (copied from packages/next/src/shared/lib/page-path/normalize-path-sep.ts) and
 * isDynamicRoute (packages/next/src/shared/lib/router/utils/is-dynamic.ts, strict mode only and
 * without the interception-route handling) at vercel/next.js@d8bfc3c994670c367e6e31853b78f42e8b7fba85.
 * Not part of the source.
 */
export function normalizePathSep(path: string): string {
  return path.replaceAll("\\", "/");
}

const TEST_STRICT_ROUTE = /\/\[[^/]+\](?=\/|$)/;

export function isDynamicRoute(route: string): boolean {
  return TEST_STRICT_ROUTE.test(route);
}
