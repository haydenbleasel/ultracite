---
"ultracite": patch
---

Running `ultracite init` again no longer rewrites an `.aider.conf.yml` that already has Ultracite's settings. The file was re-serialised even when nothing needed changing, which normalised its spacing (`read:   [AGENTS.md]` became `read: [ AGENTS.md ]`, and aligned comments moved) and listed it as updated. It is now left exactly as written unless a key changes.
