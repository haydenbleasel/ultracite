---
"ultracite": patch
---

Aider now loads Ultracite's rules and lints each file it edits. Aider reads no instructions file on its own, so the `ultracite.md` that `init --agents aider` used to write was never loaded. Now `init` writes the rules to `AGENTS.md` and merges two keys into `.aider.conf.yml`: `read: AGENTS.md`, and `lint-cmd` set to the project's `ultracite fix`, which Aider runs on every file it edits, asking the model to fix whatever is left. The rest of the file, comments included, stays as written, a `lint-cmd` that runs another linter is left alone, and an `ultracite.md` that holds nothing but the rules is removed. Aider keeps its own option in the `init` prompt, since the universal `AGENTS.md` option doesn't write `.aider.conf.yml`.

The agent list also uses the current names for Snowflake CoCo (formerly Snowflake Cortex), Deep Agents, goose and Gemini CLI. Their `--agents` IDs don't change.
