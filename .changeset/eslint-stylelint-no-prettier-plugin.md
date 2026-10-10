---
"ultracite": major
---

ESLint and Stylelint no longer run Prettier as a rule. `ultracite check` and `ultracite fix` already run Prettier as their own step, so the `prettier/prettier` rule from `eslint-plugin-prettier` and `stylelint-prettier` formatted and reported every file a second time. The ESLint core preset and the Stylelint preset drop those plugins and keep `eslint-config-prettier`, so no lint rule fights Prettier, and `init` no longer installs `eslint-plugin-prettier` or `stylelint-prettier`.

ESLint and Stylelint now report only lint problems. Formatting problems come from the Prettier step of `ultracite check`, so running `eslint` or `stylelint` on their own no longer reports formatting. A config that sets `prettier/prettier` itself now fails with an unknown-rule error: remove that setting, or install the plugin and register it in your own config to keep it.

Zed formats with Prettier on the ESLint toolchain. `init` used to set ESLint's language server as Zed's formatter for JavaScript, TypeScript and TSX, which only applied Prettier through the `prettier/prettier` rule, so in v8 Zed would have applied ESLint's fixes without formatting. It now keeps ESLint's fixes as code actions and sets `"formatter": "prettier"`, so Zed's Prettier integration formats afterwards with your project's Prettier config and plugins. Re-running `init` updates `.zed/settings.json`, and `ultracite upgrade --claude` or `--codex` makes the same change.
