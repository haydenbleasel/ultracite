---
"ultracite": major
---

Add three agents, and rename Windsurf to Devin Desktop.

- `init --agents` now takes `fx` (Vercel Labs), `antigravity` (Antigravity CLI, Google's successor to Gemini CLI for consumer accounts) and `grok` (Grok Build). All three read `AGENTS.md`.
- `init --hooks grok` writes a post-edit hook to `.grok/hooks/ultracite.json` in Claude Code's format. Grok Build runs it after each `Write` or `Edit` once you trust project hooks with `/hooks-trust`, and hands the problems `ultracite fix --hook` leaves back to the model. `fix --hook` now recognises Grok's own tool names (`search_replace`, `hashline_edit`), which it used to skip. Grok also reads `.claude/settings.json`, but runs a hook once when several files give it the same event, command and matcher, as the Claude Code and Grok Build hooks do, so a project can have both.
- Windsurf is now Devin Desktop, with the editor and hook ID `devin` instead of `windsurf`, which init still accepts with a note to switch. Its hook now goes in `.devin/hooks.v1.json`, which Devin Local reads.
