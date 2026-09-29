---
"ultracite": patch
---

Re-running `ultracite init` now updates the Ultracite rules in `AGENTS.md`, `.claude/CLAUDE.md`, `GEMINI.md` and the other shared rule files in place, instead of appending another full copy.

- Previously a copy was appended whenever the linter, the package manager or the rules text changed. For example, switching from Biome to Oxlint left instructions for both engines side by side. Duplicate copies written by earlier versions are now removed, and your own content before and after the block is kept.
- Files with CRLF line endings keep them, and are no longer duplicated on every run.
- The commands in the rules now run the project's installed CLI (`npx ultracite fix`, `yarn ultracite fix`, `pnpm exec ultracite fix`, `bunx ultracite fix`) instead of a dlx runner. For Deno they read `deno run -A npm:ultracite fix`; previously the broken `deno run -A npm: ultracite fix` was written.
- **Firebender:** rules are now written to `.firebender/rules/ultracite.mdc` with `alwaysApply: true`, where Firebender reads project rules. They were previously written as Markdown into `firebender.json`, which made that file invalid JSON and overwrote an existing Firebender config. A `firebender.json` that still holds only those Markdown rules is reset to `{}`.
