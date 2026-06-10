---
"ultracite": patch
---

Make the lint-staged integration idempotent and respect dedicated config
files.

`package.json` was always treated as the lint-staged config because the file
exists in every project, so `ultracite init` wrote the lint-staged config into
`package.json` even when a dedicated `.lintstagedrc.*` or
`lint-staged.config.*` file was present — leaving two conflicting configs.
`package.json` now only counts when it actually has a `lint-staged` key;
otherwise the dedicated config file is updated (or `.lintstagedrc.json` is
created).

Re-running `ultracite init` also appended another `npx ultracite fix` entry on
every run because the merge concatenates arrays. Updates are now skipped when
the existing config already references ultracite.
