---
"ultracite": patch
---

Update the ESLint packages `init` installs: typescript-eslint 8.72.1, `eslint-plugin-vue` 10.12, `eslint-plugin-storybook` 10.6.5, `@tanstack/eslint-plugin-query` 5.105.1, `@react-native/eslint-plugin` 0.88.1, `globals` 17.14 and `eslint-plugin-react-doctor` 0.9.21, plus the Oxlint JS plugin `oxlint-plugin-react-doctor` 0.9.21. The presets were checked against ESLint 10.14.

The Vue preset turns on `eslint-plugin-vue`'s three new rules automatically: [`vue/no-content-outside-block`](https://eslint.vuejs.org/rules/no-content-outside-block.html) reports content outside the top-level blocks of a `.vue` file, which the compiler drops; [`vue/no-define-model-default`](https://eslint.vuejs.org/rules/no-define-model-default.html) reports a `default` in `defineModel()`; and [`vue/no-props-shadow`](https://eslint.vuejs.org/rules/no-props-shadow.html) reports `<script setup>` declarations that shadow a prop. The new `block-lang` `required` and `require-explicit-emits` `ignoreMixins` options stay at their defaults: the first would reject components without a given block, and the second skips components that use mixins.

react-doctor 0.9.21 adds [`react-doctor/forwarded-set-state-in-effect`](https://react.doctor/docs/rules/react-doctor/forwarded-set-state-in-effect), which reports a state setter passed from an effect to a helper that calls it synchronously, such as `useEffect(() => syncFrom(id, setValue), [id])`. It is on in the ESLint React preset and in `ultracite/oxlint/js-plugins`. Setters handed to subscriptions, timers and listeners aren't reported.
