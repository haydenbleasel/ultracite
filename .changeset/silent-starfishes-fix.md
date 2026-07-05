---
"ultracite": patch
---

Fix Oxlint initialization by installing a verified TypeScript build alongside the GitHub and SonarJS JS plugin presets, preventing `eslint-plugin-sonarjs` from resolving compiler builds that crash while loading.
