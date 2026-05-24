---
"ultracite": minor
---

Add a dedicated `tanstack` framework preset for Biome, ESLint, and Oxlint. The ESLint preset layers `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router`, and `@tanstack/eslint-plugin-start`, while the Biome and Oxlint presets relax file-naming conventions for `routes/` directories and the generated `routeTree.gen.ts`. Framework detection now maps `@tanstack/react-query`, `@tanstack/react-router`, and `@tanstack/react-start` to the new `tanstack` preset.

Two behavior changes for existing consumers: TanStack Query rules now live in the `tanstack` preset instead of `react`, so projects that relied on Query rules must opt into `tanstack`; and TanStack Router projects now resolve to the `tanstack` preset rather than `remix`.
