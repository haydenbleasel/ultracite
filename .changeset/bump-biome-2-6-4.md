---
"ultracite": patch
---

Update Biome to 2.6.4. The release adds 30 nursery rules, which the Biome presets leave off, and promotes or removes none, so the presets are unchanged and the `@biomejs/biome` peer range stays at `^2.6.2`. The `useSortedProperties` assist that core turns on now follows `stylelint-config-recess-order` 7.9.0, so `ultracite fix` can reorder CSS properties it used to leave alone, such as `scroll-behavior`, anchor positioning and multi-column layout. It also no longer offers a sort that would change which of two overlapping declarations wins. `noShorthandPropertyOverrides` also recognises overrides of logical border, corner shape, `position-try`, `text-box` and `transition-behavior` properties. The Markdown formatter stays off in core: 2.6.4 fixes the dropped space before inline code, but it still rewrites a literal `[ ]` in prose to `[]`. See the [2.6.4 release notes](https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.6.4).
