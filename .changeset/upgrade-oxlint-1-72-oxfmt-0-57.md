---
"ultracite": patch
---

Upgrade to Oxlint 1.72.0 and Oxfmt 0.57.0. Oxfmt 0.57 adds native CSS and GraphQL formatters. The five new non-nursery Oxlint rules from the 1.71/1.72 releases are already covered by the presets (`node/no-sync`, `node/no-mixed-requires`, `unicorn/prefer-number-coercion`, `unicorn/max-nested-calls`, `vue/no-async-in-computed-properties`). The markdown `:::` container-directive fence patch (which keeps `proseWrap: "never"` from folding fences into prose) was regenerated against the 0.57 bundle.
