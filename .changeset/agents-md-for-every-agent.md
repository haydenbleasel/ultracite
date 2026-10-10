---
"ultracite": minor
---

Every agent now reads Ultracite's rules from `AGENTS.md`. `init` writes the rules there once, whichever agents you pick, and only adds a file for the four agents that need one more step to see them:

- **Claude Code** reads `AGENTS.md` only when the project has no `CLAUDE.md`, so `init` adds an `@AGENTS.md` import to the project's `CLAUDE.md` or `.claude/CLAUDE.md` when there is one.
- **Gemini CLI** reads `GEMINI.md` by default, so `init` adds `AGENTS.md` to `context.fileName` in `.gemini/settings.json`, keeping `GEMINI.md`.
- **Aider** gets `.aider.conf.yml` pointed at `AGENTS.md`, as before.
- **Replit Agent** reads only `replit.md`, so it keeps a copy of the rules there.

Firebender now reads `AGENTS.md` too. The `init` prompt asks which agents you use and lists `AGENTS.md` (Universal) plus those four.

Projects set up by earlier versions move over the next time `init` runs: it takes Ultracite's block out of `.claude/CLAUDE.md`, `GEMINI.md`, `.firebender/rules/ultracite.mdc` and Aider's `ultracite.md`, removes a file left with nothing else in it, and adds the import or settings that agent needs. That happens whenever one of those files still holds the rules, whichever agents you pick, since a leftover `.claude/CLAUDE.md` stops Claude Code from reading `AGENTS.md`.
