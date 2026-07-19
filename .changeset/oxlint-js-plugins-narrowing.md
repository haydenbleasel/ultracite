---
"ultracite": patch
---

Fix generated oxlint.config.ts accessing plugin.name on ExternalPluginEntry without narrowing the string form, which caused a TypeScript error in projects that type-check the config (#753)
