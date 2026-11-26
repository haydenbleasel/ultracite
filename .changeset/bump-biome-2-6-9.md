---
"ultracite": patch
---

Update Biome to 2.6.9. The release adds 28 nursery rules, which the Biome presets leave off, and promotes, renames or removes none, so the presets are unchanged and the `@biomejs/biome` peer range stays at `^2.6.7`.

Biome 2.6.9 fixes a false syntax error we reported. An import that mixes an inline `type` specifier with a value and carries import attributes, such as `import { type A, b } from "./m" with { … }`, is no longer reported as a type-only import ([biomejs/biome#13304](https://github.com/biomejs/biome/issues/13304)). An import whose specifiers are all inline `type` is still reported, though TypeScript accepts it.

Several rules the presets already turn on change after upgrading. `noDescendingSpecificity` no longer reports nested selectors that style different elements, and now reports `a:hover { … }` followed by `a { … }`, as Stylelint does. `noDuplicateSelectors` finds duplicates it missed, such as a repeated attribute selector with a quoted value. The test rules `noIdenticalTestTitle`, `useTestHooksOnTop` and `useTestHooksInOrder` now check the tests inside `describe.todo`, `describe.skipIf(…)` and Playwright's `test.describe.serial` blocks. `useFilenamingConvention` reports once per HTML, Vue, Svelte or Astro file instead of once per embedded script, and in Astro files `useImportType`, `noUndeclaredVariables` and `noUnusedVariables` follow what the template uses.

The HTML formatter now collapses whitespace in a static `class` attribute, formats a valid `style` attribute as CSS declarations, and no longer adds a line break, which rendered as a space, between elements that touch in the source. See the [2.6.9 release notes](https://github.com/biomejs/biome/releases/tag/%40biomejs%2Fbiome%402.6.9).
