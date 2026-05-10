---
"ultracite": patch
---

Add missing Biome stable rules to the core config:

- `suspicious/noDuplicateDependencies` → `"error"` — flags a dependency listed multiple times in the same group, or across `dependencies` and `devDependencies`, in `package.json`.
- `suspicious/useDeprecatedDate` → `"off"` — GraphQL-only convention requiring a `deletionDate` argument on `@deprecated`; too opinionated for the default preset.
