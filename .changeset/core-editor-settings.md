---
"ultracite": patch
---

`ultracite init` now updates an existing `.vscode/settings.json` or `.zed/settings.json` in place, so your comments and formatting are kept. Before, the file was re-serialised as plain JSON, which stripped every comment. A settings file with a syntax error is now left unchanged with a warning. Before, it was rewritten with whatever part the parser could recover, which dropped the rest.

For the ESLint toolchain, init now also installs the Prettier VS Code extension (`esbenp.prettier-vscode`), since the settings it writes make Prettier the default formatter. Before, only the ESLint extension was installed, so format-on-save did nothing until you added Prettier yourself.
