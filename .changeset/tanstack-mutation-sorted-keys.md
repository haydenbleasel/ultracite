---
"ultracite": patch
---

Stop sorting object keys across the whole TanStack presets, not just route files. TanStack Query mutation options are order-sensitive too: TypeScript infers the `onMutate` context from context-sensitive callbacks in source order, so moving `onError`/`onSettled` above `onMutate` turns the context into `{}` and `ultracite fix` broke type-correct code (`TS2339: Property '...' does not exist on type '{}'`). Mutation and query options live anywhere (hooks, components, colocated files), so the route-file exemption could not cover them. `ultracite/oxlint/tanstack` now sets `sort-keys` to `off` and `ultracite/biome/tanstack` now sets `useSortedKeys` to `off` for all files.
