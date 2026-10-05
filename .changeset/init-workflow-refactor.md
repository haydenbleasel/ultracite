---
"ultracite": patch
---

`ultracite init` now skips every prompt when you pass any of `--pm`, `--editors`, `--agents`, `--hooks`, `--integrations`, `--frameworks` or `--workspace-framework`, as documented. Before, the editor, agent, hook, skill and (with `--frameworks`) integration prompts still asked, which stalled scaffolding tools that call init without a TTY. `--js-plugins` with a linter other than Oxlint now stops init with an error instead of being silently ignored, and without `--linter` it skips the linter prompt.
