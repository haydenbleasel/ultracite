---
"ultracite": patch
---

`ultracite upgrade --version` now refuses a release older than 7.11.0, the first with an `upgrade` command, before it installs anything. It used to install that release and then hand off to its `upgrade`, which failed with `error: unknown command 'upgrade'` and left the old `ultracite` in `package.json` beside a linter nothing had synced to it. A major or dist-tag that still resolves to such a release is installed with a warning instead of the failed hand-off.
