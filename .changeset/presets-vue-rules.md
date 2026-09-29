---
"ultracite": patch
---

The Oxlint `vue` preset now lists every non-nursery Vue rule Oxlint implements, like the other framework presets. It previously enabled 18 of them. Among the 27 newly enabled rules are `vue/valid-define-props`, `vue/valid-define-emits`, `vue/no-export-in-script-setup`, `vue/no-lifecycle-after-await`, `vue/no-arrow-functions-in-watch`, `vue/no-side-effects-in-computed-properties`, `vue/require-typed-ref`, `vue/define-props-destructuring` and the `vue/no-deprecated-*` rules. `vue/max-props` is off in both the Oxlint and ESLint presets, because its default allows a single prop per component.

The Oxlint `vitest` preset now enables `vitest/consistent-test-it`, the one Vitest rule it was missing (the ESLint preset already had it).

Vue files whose names Nuxt and file-based Vue Router require (`pages/**`, `layouts/**`, `error.vue` and `app.vue`) are exempt from `useVueMultiWordComponentNames` in the Biome preset and from `vue/multi-word-component-names` in the ESLint preset. Previously `pages/index.vue`, `layouts/default.vue` and `error.vue` were always reported.
