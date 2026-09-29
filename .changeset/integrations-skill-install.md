---
"ultracite": patch
---

Installing the Ultracite skill from `ultracite init` now works when init runs in a normal terminal.

Init runs `skills add haydenbleasel/ultracite` without a terminal attached. When the `skills` CLI needed to ask which agents to install to, or whether to install into the project or globally, it could not show the prompt:

- In some cases it cancelled the prompt and exited successfully with nothing installed, so init said "Ultracite skill installed." when the skill wasn't there.
- In others it failed, so the install never happened.

Init now passes `--yes`, so `skills` installs the skill into the project for the agents it detects without asking. The "install it later" hint still shows the interactive `skills add haydenbleasel/ultracite` command.
