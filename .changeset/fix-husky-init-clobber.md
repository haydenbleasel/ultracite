---
"ultracite": patch
---

Fix the Husky integration overwriting an existing `.husky/pre-commit` hook: `ultracite init` ran `husky init`, which unconditionally replaces the hook with `npm test`. It now runs plain `husky` to set up the hooks infrastructure without touching the hook file.
