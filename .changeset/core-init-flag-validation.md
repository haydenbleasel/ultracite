---
"ultracite": patch
---

`ultracite init` now checks every flag value before it changes anything in the project. An unknown value for `--linter`, `--pm`, `--frameworks`, `--editors`, `--agents`, `--hooks`, `--integrations` or `--js-plugins` stops init with a message listing the valid values. Previously a misspelled `--linter` (for example `--linter Biome`) deleted every existing Biome, ESLint, Prettier, Stylelint, Oxlint and oxfmt config file and then crashed.

When `--linter` is not passed and init runs without prompts (because of `--quiet`, `CI`, or flags such as `--agents` or `--pm`), it now keeps the linter the project is already set up with and only falls back to Oxlint when there is none. Running `ultracite init --agents universal` on a Biome project no longer migrates it to Oxlint. The interactive linter prompt also preselects the detected linter.
