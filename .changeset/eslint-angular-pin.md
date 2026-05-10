---
"ultracite": patch
---

Pin `@angular-eslint/eslint-plugin` to `^21.3.1` in `packages/cli/package.json`. Previously declared as `"latest"`, which defeats lockfile reproducibility and means each `bun install` could pull a newer version than what was tested at publish time. The current resolved version (21.3.1) is unchanged.
