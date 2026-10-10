---
"ultracite": patch
---

Add three agents and fix the Windsurf hook.

- `init --agents` now takes `fx` (Vercel Labs), `antigravity` (Antigravity CLI, Google's successor to Gemini CLI for consumer accounts) and `grok` (Grok Build). All three read `AGENTS.md`.
- `init --hooks grok` writes a post-edit hook to `.grok/hooks/ultracite.json` in Claude Code's format. Grok Build runs it after each `Write` or `Edit` once you trust project hooks with `/hooks-trust`, and hands the problems `ultracite fix --hook` leaves back to the model. `fix --hook` now recognises Grok's own tool names (`search_replace`, `hashline_edit`), which it used to skip. Grok also runs `.claude/settings.json` hooks, so set up one of the two.
- The Windsurf hook now goes in `.devin/hooks.json`. Devin Desktop, formerly Windsurf, reads that file and ignores `.windsurf/hooks.json` once it has hooks, so a project with its own `.devin/hooks.json` never ran Ultracite's hook. Re-running `init --hooks windsurf` moves the hook, copies the project's own hooks from `.windsurf/hooks.json` into the new file so they keep running, and leaves the old file with only those hooks, or removes it when nothing else is in it.
