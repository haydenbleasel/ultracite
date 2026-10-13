---
"ultracite": patch
---

The Oxlint `js-plugins` preset now enables the 32 SonarJS rules that the ESLint core preset already runs without type information, including the security rules `sonarjs/slow-regex`, `sonarjs/sql-queries`, `sonarjs/disabled-auto-escaping` and `sonarjs/dompurify-unsafe-config`. SonarJS marks these rules `requiresTypeChecking`, but they also check the syntax tree, so they work through Oxlint's JS plugin bridge. The preset had left out every marked rule.
