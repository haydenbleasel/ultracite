---
"ultracite": minor
---

Add `eslint-plugin-jsdoc` to the ESLint preset. The oxlint preset already enforces a set of jsdoc rules, but the ESLint preset had no jsdoc coverage at all. The plugin is now installed by `ultracite init` for ESLint setups and enables the same rule selection the oxlint preset enforces (`check-access`, `check-property-names`, `check-tag-names`, `empty-tags`, `implements-on-classes`, `no-defaults`, and the `require-*` description/name/type rules), keeping the two presets in lockstep.
