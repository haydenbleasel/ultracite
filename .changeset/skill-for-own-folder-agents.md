---
"ultracite": patch
---

Install the Ultracite skill where AdaL, IBM Bob and Qoder look for it. They read skills only from their own folders (`.adal/skills`, `.bob/skills`, `.qoder/skills`), never from the shared `.agents/skills`, so they never found it. `init` now installs the skill for each of them you choose in `--agents`, and for any whose folder the project already has.
