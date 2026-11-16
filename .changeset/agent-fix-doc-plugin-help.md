---
"ultracite": patch
---

`ultracite fix --claude` and `fix --codex` now give the agent the rule description and documentation link for `jsdoc-js/*` and `tsdoc/*` diagnostics on Oxlint. Oxlint's report has neither for a rule that comes from a JS plugin, so Ultracite reads them from the plugin, but only did so for `eslint-plugin-github`, `eslint-plugin-sonarjs` and `oxlint-plugin-react-doctor`. The two documentation plugins were left with the one-line message alone.
