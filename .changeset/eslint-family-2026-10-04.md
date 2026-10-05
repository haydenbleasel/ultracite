---
"ultracite": patch
---

Update the ESLint presets' plugins: `eslint` 10.12, `eslint-plugin-unicorn` 77, `eslint-plugin-jsdoc` 65, `@typescript-eslint` 8.71, `eslint-plugin-sonarjs` 4.2.2, `eslint-plugin-react-doctor` and `oxlint-plugin-react-doctor` 0.9.16, plus patch releases of the Next.js, TanStack Query, `n`, Solid and Storybook plugins.

The ESLint core preset enables every non-deprecated JavaScript rule from unicorn, so it now also runs unicorn 77's 21 new JavaScript rules, including [`no-unnecessary-parameters`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v77.0.0/docs/rules/no-unnecessary-parameters.md), [`no-unsafe-json-serialization`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v77.0.0/docs/rules/no-unsafe-json-serialization.md), [`prefer-promise-static-methods`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v77.0.0/docs/rules/prefer-promise-static-methods.md) and a set of `no-invalid-*` checks for DOM, `Intl`, `Response`, Temporal and property descriptor arguments. It also enables the new type-aware [`@typescript-eslint/no-unsafe-enum-assignment`](https://typescript-eslint.io/rules/no-unsafe-enum-assignment). Unicorn 77 moves its CSS-only rules to `eslint-cssicorn`; the preset never enabled them for JavaScript files, so nothing is lost.
