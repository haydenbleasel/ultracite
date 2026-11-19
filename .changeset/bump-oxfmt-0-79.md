---
"ultracite": patch
---

Update oxfmt to 0.79.0. The release changes no options, and the `oxfmt` peer range stays at `>=0.71.0 <1`, but `ultracite fix` can reformat files it used to leave alone after upgrading:

- `.html` files (0.76.0) and `.vue` files (0.77.0) are now formatted by oxfmt's own HTML formatter instead of the bundled Prettier, so their output can differ in places.
- The files oxfmt still hands to Prettier, such as `.mdx`, `.astro` and `.svelte`, are formatted by Prettier 3.10.1 instead of 3.9.10.
- A parenthesised expression that is indexed, such as `(a ?? [])[1]`, breaks inside its parentheses the way `(a ?? []).b` does.
- Tailwind class sorting now reaches calls printed as member chains and no longer sorts template literals inside calls that aren't Tailwind functions.

It also fixes a run of formatting bugs, among them decorators dropped from rest parameters, parentheses dropped around a generic function type in a type assertion and around `<` on the left of `>`, and TypeScript in `.astro` files, which is now formatted as TSX. `ultracite init` now installs `@astrojs/compiler-rs` 0.5.3 for Astro projects. See the release notes for [0.76.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.76.0), [0.77.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.77.0), [0.78.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.78.0) and [0.79.0](https://github.com/oxc-project/oxc/releases/tag/oxfmt_v0.79.0).
