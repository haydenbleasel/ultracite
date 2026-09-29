/**
 * File-based routing conventions shared by the oxlint and ESLint presets.
 * Routers encode the URL in route and page filenames, which the kebab-case
 * filename rules (github/filenames-match-regex, unicorn/filename-case) would
 * otherwise reject.
 */

// Route directories of file-based routers: TanStack Router (`__root.tsx`,
// `$.tsx`, `posts.$postId.tsx`, `{-$slug}.tsx`), React Router and Remix
// (`_index.tsx`, `posts.$postId.tsx`) and SvelteKit (`+page.ts`).
export const ROUTE_FILE_GLOB = "**/routes/**/*.{js,jsx,ts,tsx}";

// Filename grammar for page routes (Astro, Next.js pages router): an optional
// leading underscore for special and private pages (`_app`, `_document`,
// `_error`), then one or more kebab-case tokens or bracketed kebab-case route
// params (`[slug]`, `[...slug]`, `[[...slug]]`, `[lang]-[version]`), followed
// by at most one extra dotted segment (`rss.xml`, `[slug].json`). Params stay
// kebab-case because unicorn/filename-case checks the same names.
export const PAGE_ROUTE_FILENAME_PATTERN =
  "^_?(?:\\[\\[\\.\\.\\.[a-z0-9-]+\\]\\]|\\[(?:\\.\\.\\.)?[a-z0-9-]+\\]|[a-z0-9-]+)+(?:\\.[a-z0-9-]+)?$";
