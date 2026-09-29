---
"ultracite": patch
---

`ultracite init --integrations lint-staged` no longer damages or shadows an existing lint-staged config.

- An extension-less `.lintstagedrc` written in YAML (which is how lint-staged reads it) is now edited as YAML. Previously it was overwritten with a JSON file holding only the Ultracite task, deleting the user's own tasks, and single-quoted YAML was silently skipped.
- YAML configs are edited through the `yaml` Document API, so comments and the rest of the file are kept.
- TypeScript configs (`.lintstagedrc.ts`, `.mts`, `.cts` and `lint-staged.config.ts`, `.mts`, `.cts`) and the `lint-staged` key of `package.yaml` are now recognised. Previously init created a `.lintstagedrc.json` next to them, and because lint-staged uses only the first config in a directory, the user's config silently stopped running.
- When a config can't be edited automatically (a function-based entry, a CommonJS module that can't be loaded, a syntax error), init now leaves it untouched and prints the command to add, instead of writing a second config file that would replace it.
- When both exist, the dedicated config file is updated rather than the `package.json` key, matching the file lint-staged actually uses.
- A single command already mapped to the same glob is kept alongside `ultracite fix` instead of being replaced.
- The task now runs the project's installed Ultracite (`npx`, `yarn`, `pnpm exec`, `bunx`) instead of `yarn dlx` / `pnpm dlx`, which don't exist in Yarn 1 or download the latest release instead of the pinned one. Re-running init upgrades a `dlx` command written by an earlier version.
