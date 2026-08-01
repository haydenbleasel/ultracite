---
"ultracite": patch
---

Update ESLint to 10.8.0 and all ESLint plugins to their latest versions. Highlights:

- `eslint-plugin-react-doctor` 0.9.3: the react preset expands from 149 to 417 rules, adopting the upstream `recommended` set (react-router, three.js/r3f, ink, motion, remotion, zustand/valtio/mobx, and more) while excluding rules that duplicate already-enabled `react`, `react-hooks`, and `jsx-a11y` rules. The next preset gains `nextjs-async-dynamic-api-not-awaited` and `nextjs-metadata-url-consistency`; the tanstack preset gains `tanstack-start-missing-scripts`, `query-floating-mutate-async`, and `query-no-mutation-in-effect-as-read`.
- `eslint-plugin-unicorn` 72: adds `no-missing-local-resource`, `no-multiple-promise-resolver-calls`, `no-shorthand-property-overrides`, `no-transition-all`, `no-unnecessary-string-trim`, `no-useless-re-export`, `prefer-then-catch`, and `require-frontmatter-fields`. CSS-only rules are excluded from the preset since they fail config validation for JS files.
- `eslint-plugin-sonarjs` 4.2: adds 11 rules including `no-fixed-wait-in-tests`, `parameterized-tests`, `assertions-in-test-cases`, `prefer-native-lodash-alternative`, and `explicit-test-skip`.
- `typescript-eslint` 8.65: `@typescript-eslint/no-loop-func` and `@typescript-eslint/no-restricted-imports` were deprecated upstream in favor of the base rules, which now apply to TypeScript files.
- `eslint-plugin-astro` 3: removes `astro/no-omitted-end-tags` and `astro/valid-compile`.
- `eslint-plugin-svelte` 3.22: adds `no-bind-value-on-checkable-inputs` and `no-conflicting-module-names`; `no-restricted-html-elements` is now off because its schema requires a user-supplied element list.
- `@angular-eslint/eslint-plugin` 22.1: adds `inject-at-top` and `prefer-service-decorator`.
