---
"ultracite": patch
---

`ultracite init` now looks for existing ESLint, Prettier and Stylelint configs in the same order the tools do, so when a project has more than one, init updates the one the tool actually loads. For example, Prettier reads `.prettierrc.json` before `prettier.config.mjs`, and ESLint reads `eslint.config.js` before `eslint.config.mjs`. Before, init could update a config the tool ignored and leave the active one in place. Stylelint's `.stylelintrc.ts` and `stylelint.config.ts` are now recognised too.
