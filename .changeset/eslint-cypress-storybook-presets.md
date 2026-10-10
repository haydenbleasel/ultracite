---
"ultracite": major
---

Cypress and Storybook rules move out of the ESLint core preset into opt-in framework presets, `ultracite/eslint/cypress` and `ultracite/eslint/storybook`. Core loaded both plugins for every project, so `init` installed `eslint-plugin-cypress`, `eslint-plugin-storybook` and the whole `storybook` package for every ESLint setup, whether or not the project used them.

`init` now offers `cypress` and `storybook` with the other frameworks (`--frameworks cypress storybook`). It preselects them when `cypress` or `storybook` is in `package.json`, and installs their plugins only when you pick them. To keep linting Cypress specs and stories, add the presets to `eslint.config.mjs` after `core`:

```js
import core from "ultracite/eslint/core";
import cypress from "ultracite/eslint/cypress";
import storybook from "ultracite/eslint/storybook";

export default [...core, ...cypress, ...storybook];
```

Oxlint and Biome have no Cypress or Storybook rules, so `ultracite/oxlint/cypress`, `ultracite/oxlint/storybook`, `ultracite/biome/cypress` and `ultracite/biome/storybook` are empty presets that keep the framework selectable with every linter.
