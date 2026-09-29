---
"ultracite": patch
---

Installing the Ultracite skill from `ultracite init` now works when init runs in a normal terminal.

Init runs `skills add haydenbleasel/ultracite` without a terminal attached. When the `skills` CLI needed to ask which agents to install to, or whether to install into the project or globally, it could not show the prompt:

- In some cases it cancelled the prompt and exited successfully with nothing installed, so init said "Ultracite skill installed." when the skill wasn't there.
- In others it failed, so the install never happened.

Init now passes `--yes` and names the agents to install for, so `skills` installs without asking. The skill always goes to the shared `.agents/skills` directory, which Codex, Cursor, GitHub Copilot, Gemini CLI, Amp, Cline, OpenCode and other agents read. It also goes to the skills directory of any agent whose project folder exists (for example `.claude`, `.windsurf`, `.codebuddy` or `.roo`, which init creates when you choose those agents).

Init names the agents because otherwise, in a project where `skills` detects no agent, `--yes` would install for every agent it knows. That also created a `.claude/skills` link and a second copy in a top-level `agent/` directory (for the Eve framework). The "install it later" hint still shows the interactive `skills add haydenbleasel/ultracite` command.
