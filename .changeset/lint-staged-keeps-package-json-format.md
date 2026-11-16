---
"ultracite": patch
---

`ultracite init` no longer reformats `package.json` when it updates a `lint-staged` config stored there. The file was written back with two-space indentation and LF line endings, so a tab-indented or CRLF `package.json` came back with every line changed. It now keeps the file's own indentation and line endings, as the other `package.json` edits `init` makes already do.
