---
"ultracite": patch
---

Fix Biome refusing to run in a new project with no ignore file of its own. The core preset reads ignores from version control, and Biome looks for them only in the folder that holds `biome.jsonc`, so it stopped with "Biome couldn't find an ignore file" outside a git repository, and in a package below the repository root, until that folder had a `.gitignore`. When `init` creates `biome.jsonc` in a folder with no `.git`, `.gitignore` or `.ignore`, it now sets `vcs.root` to the repository root, or writes a `.gitignore` with `node_modules` when there's no repository.
