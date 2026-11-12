import { createRequire } from "node:module";

/**
 * Ultracite's version. ESLint's `--cache` keys a parser or processor on its
 * `meta.name` and `meta.version`, so the ones Ultracite writes carry this, and
 * a release that changes what they do invalidates the cache.
 */
export const { version } = createRequire(import.meta.url)("../../package.json");
