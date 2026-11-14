---
"ultracite": patch
---

The Oxlint workspace config `ultracite init --workspace-framework` writes now repeats only the properties the root config sets. It always read `root.env`, `root.ignorePatterns` and `root.settings`, but a root config has no `settings` unless a JS plugin needs them, so the generated file had a type error (`Property 'settings' does not exist`), and with `--type-aware` the project failed `ultracite check` straight after `init` with `typescript(no-unsafe-assignment)`. If you add `settings` to the root config later, add `settings: root.settings` to the workspace config as well.
