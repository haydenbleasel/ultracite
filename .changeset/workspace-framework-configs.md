---
"ultracite": minor
---

`ultracite init` takes `--workspace-framework <path>=<framework>` for monorepos whose workspaces use different frameworks. For each workspace, it writes an Oxlint, Biome or ESLint config in that directory that extends the root config and adds the workspace's presets, so framework rules only run where they apply and editors see the same rules as `ultracite check`.
