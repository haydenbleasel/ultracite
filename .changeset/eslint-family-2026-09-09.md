---
"ultracite": patch
---

Update the ESLint family: `@angular-eslint/eslint-plugin` 22.5, `@typescript-eslint/*` 8.70, `eslint-plugin-solid` 0.18, `eslint-plugin-vue` 10.11, `eslint-plugin-jsdoc` 64.3.8, `eslint-plugin-cypress` 7.0.2, `@darraghor/eslint-plugin-nestjs-typed` 7.5.2 and `prettier-plugin-astro` 1.0. The dynamic presets pick up the seven new rules automatically: `@typescript-eslint/no-generated-empty-object-type`, `@angular-eslint/reactive-context-must-read-signal`, `vue/no-shadow-native-events`, and Solid's `no-boolean-enumerated-attribute`, `no-store-mutation-outside-setter`, `no-unused-signal` and `no-write-in-pure-computation`. Note that `prettier-plugin-astro` 1.0 is a rewrite on the Astro 7 Rust compiler (Node 22.12+); expect whitespace diffs on first run and mirror any custom `compressHTML` via its new `astroCompressHTML` option.
