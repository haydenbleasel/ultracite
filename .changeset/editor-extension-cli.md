---
"ultracite": patch
---

`ultracite init` now installs the linter's editor extension into the editor you picked. Every VS Code-based editor used to run `code --install-extension`, which put the extension in VS Code rather than in Cursor, Windsurf, Kiro or the others. Each editor now uses its own launcher: `code` for VS Code, `cursor` for Cursor, `devin-desktop` for Windsurf (now Devin Desktop, falling back to `windsurf` on installs from before the rename), `kiro` for Kiro and `void` for Void. When the launcher isn't on your `PATH`, init asks you to install the extension yourself, as it does when an install fails. Antigravity, CodeBuddy, IBM Bob and Trae get the same message, since Ultracite doesn't run a launcher for them. CodeBuddy's `codebuddy` command, for one, is its terminal agent, not the IDE.
