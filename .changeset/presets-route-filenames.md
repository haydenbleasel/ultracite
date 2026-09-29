---
"ultracite": patch
---

`github/filenames-match-regex` now accepts file-based routing filenames in the ESLint preset too, and Next.js's special pages in both presets.

- The page-route regex (Oxlint `js-plugins` and now ESLint `core`) allows a leading underscore, so the Next.js pages-router files `_app`, `_document` and `_error`, which cannot be renamed, are no longer reported. Other names in `pages/` (`BadPage.ts`) and camelCase route params (`[postId]`, which `unicorn/filename-case` rejects too) are still reported.
- The ESLint `core` preset now carries the same route exemptions as the Oxlint `js-plugins` preset (#799, #804). Previously it applied the plain kebab-case regex everywhere and reported SvelteKit's `+page.ts` and `+server.ts`, TanStack Router and React Router files such as `posts.$postId.ts`, and page routes such as `[slug].json.ts` and `[...auth].ts`.
- The route-directory exemptions (`github/filenames-match-regex` in Oxlint `js-plugins` and ESLint `core`, plus `unicorn/filename-case` and `no-use-before-define` in the Oxlint and ESLint `tanstack` presets) now cover `.js` and `.jsx` route files as well as `.ts` and `.tsx`.
