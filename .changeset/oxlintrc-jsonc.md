---
"ultracite": patch
---

Ultracite now recognises `.oxlintrc.jsonc`, which Oxlint loads like `.oxlintrc.json`. A project whose only Oxlint config had that name got "No linter configuration found" from `check`, `fix`, `doctor` and `upgrade`. `ultracite init` wrote an `oxlint.config.ts` next to it without migrating it, after which Oxlint refused to run with both, and `doctor` reported that setup as healthy. `init` now moves its settings into the TypeScript config and removes it, as it does for `.oxlintrc.json`, and `doctor` fails when it sits beside another Oxlint config.
