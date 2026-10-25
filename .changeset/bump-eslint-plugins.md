---
"ultracite": patch
---

Update the ESLint plugins `init` installs: typescript-eslint 8.72, `eslint-plugin-jsdoc` 65.4, `eslint-plugin-n` 18.5, `eslint-plugin-jest` 29.17, `@vitest/eslint-plugin` 1.6.28, `@next/eslint-plugin-next` 16.4, `@angular-eslint/eslint-plugin` 22.6, `eslint-plugin-svelte` 3.23.1, `eslint-plugin-storybook` 10.6.3, `eslint-plugin-qwik` 1.20.3, `@tanstack/eslint-plugin-query` 5.104.5, `@darraghor/eslint-plugin-nestjs-typed` 7.5.8, `eslint-plugin-react-doctor` 0.9.18 and `prettier-plugin-astro` 1.1.2, plus the Oxlint JS plugins `oxlint-plugin-react-doctor` 0.9.18 and `@shadcn/lint` 0.2.3. None of them adds or removes a rule, so the presets are unchanged. The releases fix false positives and add options the presets leave at their defaults, such as typescript-eslint's `await-thenable` `allowMixedPromiseArrays` and jsdoc's `check-alignment` `ignoreEmptyLines`. The presets were checked against ESLint 10.13.
