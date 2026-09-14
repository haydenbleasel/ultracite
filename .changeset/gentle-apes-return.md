---
"ultracite": patch
---

Allow top-level `return` in Astro frontmatter. The core preset now turns off `unicorn/prefer-module` for `**/*.astro` files (the rule cannot be configured to allow only `return`), and keeps `require()`, `module.exports`, `__dirname` and `__filename` flagged there via `import/no-commonjs` and `no-restricted-globals`.
