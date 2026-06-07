---
"ultracite": patch
---

Enable newly available Oxlint and Stylelint rules in the shared configs.

For Oxlint, the core preset now enables `eslint/prefer-named-capture-group`,
`jsdoc/require-yields-description`, `node/callback-return`,
`typescript/method-signature-style`, and `unicorn/import-style`.

The Vue preset now enables `vue/component-definition-name-casing`,
`vue/no-computed-properties-in-data`, `vue/no-deprecated-props-default-this`,
`vue/no-expose-after-await`, `vue/no-reserved-component-names`,
`vue/no-shared-component-data`, `vue/no-watch-after-await`,
`vue/require-prop-type-constructor`, `vue/require-render-return`,
`vue/require-slots-as-functions`, `vue/return-in-emits-validator`,
`vue/valid-define-options`, and `vue/valid-next-tick`.

The Stylelint preset now enables `display-notation` with the `short` option.
