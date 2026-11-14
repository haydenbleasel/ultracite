---
"ultracite": patch
---

`ultracite init` no longer leaves Biome unable to start when it adds the presets to a `biome.json` that already existed. The core preset reads ignore files from version control, and Biome only looks for them in the folder that holds its config, so a config in a package below the repository root, or in a folder with no repository at all, failed afterwards with "Biome couldn't find an ignore file". A new config already got `vcs.root` pointing at the repository, or a `.gitignore` outside one; an existing config now gets the same, unless it sets `vcs` itself.
