---
"ultracite": patch
---

Move @typescript-eslint/utils from dependencies to devDependencies. It was accidentally shipped as a runtime dependency in 7.9.0, pulling eslint and the typescript-eslint packages into every consumer's install (including oxlint-only setups) via npm's automatic peer dependency installation. Nothing in the published package imports it — it only exists to support the workspace-internal rule-parity script.
