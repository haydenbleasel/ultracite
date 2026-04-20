---
"ultracite": patch
---

Disable the `typescript/prefer-readonly-parameter-types` Oxlint rule. While the rule is useful for user-authored types, it fires on virtually every parameter that touches a third-party type (Express `Request`/`Response`, React events, Node `Buffer`, ORM models, DOM APIs) because those types aren't deeply readonly internally — leaving users with unfixable violations. Matches the existing ESLint config, which already has this rule off.
