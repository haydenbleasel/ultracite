---
"ultracite": patch
---

Add `**/node_modules` and `**/.git` to the shared ignore patterns. oxlint only skips `node_modules` when a `.gitignore` lists it, so in projects without one, `ultracite fix` would lint and autofix files inside `node_modules` — corrupting installed packages (e.g. rewriting `var` enum wrappers in `typescript/lib/typescript.js` to self-referencing `const`, causing "Cannot access 'Comparison' before initialization" when oxlint loads eslint-plugin-sonarjs). Fixes #737.
