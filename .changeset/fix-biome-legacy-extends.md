---
"ultracite": patch
---

Fix Biome config migration leaving the legacy bare `"extends": ["ultracite"]` form in place, which breaks Biome's module resolution since the package has no root export. It's now mapped to `ultracite/biome/core`.
