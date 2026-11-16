---
"ultracite": patch
---

In a monorepo on the ESLint provider, `ultracite init` now gives a workspace config its framework's type-aware add-on when the root `eslint.config.*` imports `ultracite/eslint/type-aware` with single quotes. Only a double-quoted import was recognised, so after a formatter rewrote the root config with single quotes, a new workspace config was written without `ultracite/eslint/<framework>/type-aware`.
