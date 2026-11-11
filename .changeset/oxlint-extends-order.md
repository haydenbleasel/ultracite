---
"ultracite": patch
---

`ultracite init` now extends the Oxlint presets in a fixed order when it updates an existing `oxlint.config.ts`: `core` first, then the framework presets, and `anti-slop` last. It used to follow the order of the preset imports, so once `ultracite fix` had sorted them, re-running `init` put `antiSlop` (and presets such as `angular` and `astro`) ahead of `core`, which turned back on the rules Anti-Slop turns off. Configs that were reordered this way are put back in order, and `init` now says when it moves a preset. A js-plugins selection now sits where the full js-plugins preset would, ahead of the react-doctor add-ons, `shadcn` and `anti-slop`, so Anti-Slop is always last.

Updating an existing `oxlint.config.ts` also keeps more of what you wrote:

- Which presets are extended now comes from `extends` rather than the imports, so a preset you import without extending (to reuse its `rules`, say) keeps its import and is no longer added to `extends`.
- A preset imported under another name, such as `import ultraciteCore from "ultracite/oxlint/core"`, keeps that name, including in the settings `init` moves over from `.oxlintrc.json`. A preset `init` adds takes an `ultracite`-prefixed name, such as `ultraciteReact`, when the config already uses the usual one.
- Your own `extends` entries stay where they were among the presets: an entry before `core` stays first, one right after a preset stays after it, and one after the last preset stays last. An entry is no longer dropped because its name matches a constant older Ultracite releases generated, such as `selectedJsPlugins`.
- A config that imports a preset with `import * as` is left unchanged with a warning that says how to fix it, instead of being rewritten into one that extends `undefined`.
