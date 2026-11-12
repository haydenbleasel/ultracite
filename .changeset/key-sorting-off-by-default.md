---
"ultracite": minor
---

Ultracite no longer sorts object keys by default. `sort-keys` is off in the Oxlint and ESLint core presets, and `useSortedKeys` is off in the Biome core preset, so `ultracite fix` stops reordering your objects and `ultracite check` stops reporting unsorted ones.

Both fixes are classed as safe, so they ran on every `ultracite fix`, and key order can change what code does: the bytes `JSON.stringify` writes, the order a loop visits keys, which entry of an `exports` map wins, and what TypeScript infers for an options object. [The research post](https://www.ultracite.ai/research/sort-keys) has the cases we measured on real codebases.

To keep sorting, turn the rule back on in your own config:

- Oxlint and ESLint: `"sort-keys": "error"` in `rules`.
- Biome: `"useSortedKeys": "on"` under `assist.actions.source`.

The TanStack presets no longer need their own exemption from key sorting and have dropped it. If you turn sorting back on in a TanStack project, turn it off again for your query, mutation and route option objects, where sorting breaks type inference.

Biome's `useSortedSelectionSet` is off too: the order of a GraphQL selection set is the key order of the response. Biome's other sorting actions (imports, JSX attributes, interface members, CSS properties, `package.json` fields and Tailwind classes) are unchanged.
