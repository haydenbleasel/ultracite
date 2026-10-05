---
"ultracite": patch
---

Add opt-in `ultracite/oxlint/gdp` and `ultracite/eslint/gdp` presets for [gdp-ts](https://github.com/rauchg/gdp-ts), which makes authorization checks visible to the type checker. Following upstream's strict mode, they stop proofs being forged with type assertions (`{} as UserIsProjectAdmin<U, P>`) or minted outside `proofs/`, ban other type assertions outside `proofs/` and `lib/ids.ts` (except `as const`), and keep provers private to their trusted module. Upstream's `no-any` is left off because core already bans `any`. Inside `proofs/`, empty proof interfaces (`interface X<P> extends Proof<"X", [P]> {}`) are allowed, and the ESLint preset ignores `_`-prefixed proof arguments in `no-unused-vars`, as Oxlint does by default. `@gdp-ts/core` ships the plugin, so there is nothing extra to install: extend the preset after `core`.
