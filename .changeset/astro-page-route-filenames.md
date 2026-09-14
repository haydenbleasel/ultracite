---
"ultracite": patch
---

Accept file-based page route filenames in `github/filenames-match-regex`. Files under `pages/` (Astro, Next.js pages router) now match a bracket-aware pattern, so dynamic, rest and optional parameters such as `[slug].astro`, `[...slug].ts` and `[[...slug]].tsx` pass while non-route names like `BadPage.ts` are still rejected.
