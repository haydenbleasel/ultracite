---
"ultracite": patch
---

`ultracite init` now installs the linter's editor extension into the editor you picked. Every VS Code-based editor used to run `code --install-extension`, which put the extension in VS Code rather than in Cursor, Windsurf, Kiro or the others. Each editor now uses its own launcher: `code` for VS Code, `cursor` for Cursor, `devin-desktop` for Windsurf (now Devin Desktop, falling back to `windsurf` on installs from before the rename), `buddy` for CodeBuddy, `antigravity-ide` for Antigravity IDE, `bobide` for IBM Bob, `kiro` for Kiro, `trae` for Trae and `void` for Void. CodeBuddy's `codebuddy` command is its terminal agent, not the IDE, so init doesn't use it. When the launcher isn't on your `PATH`, init asks you to install the extension yourself, as it does when an install fails.
