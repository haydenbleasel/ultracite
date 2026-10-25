---
"ultracite": patch
---

Update oxfmt to 0.74.0. Markdown files are now formatted by oxfmt's own Markdown formatter instead of its bundled Prettier, so `ultracite fix` can reformat some `.md` files that were already clean, including sorting imports in JavaScript and TypeScript code blocks. `.mdx` files still go through Prettier. The releases also add an `astro` option that formats `.astro` files through `prettier-plugin-astro` (it needs `@astrojs/compiler-rs` installed in the project) and an `associations` option that formats files as a chosen language. See the [0.72.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.72.0), [0.73.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.73.0) and [0.74.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.74.0) release notes for the full list of formatting fixes.
