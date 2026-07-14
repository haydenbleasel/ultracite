---
"ultracite": patch
---

Move Biome's `noUnknownAttribute` rule out of the core preset and into the `react` preset. The rule only recognises React's JSX attribute names, so projects using Solid, Svelte, Vue, or Qwik were incorrectly flagged for framework-standard attributes such as `class`.
