---
"ultracite": patch
---

`ultracite init --linter oxlint` no longer adds `"type": "module"` to `package.json`. That field changes how Node loads every `.js` file in the package, so CommonJS files such as a `next.config.js`, `postcss.config.js` or `jest.config.js` using `module.exports` stopped working after init.

Instead, init writes the Oxlint and oxfmt configs as `oxlint.config.mts` and `oxfmt.config.mts` when the package isn't an ES module package (no `"type"` or `"type": "commonjs"`). A `.mts` file always loads as an ES module, with no `MODULE_TYPELESS_PACKAGE_JSON` warning on every run, and it works under `"type": "commonjs"`. ES module packages (`"type": "module"`) still get `oxlint.config.ts` and `oxfmt.config.ts`.

Re-running init updates an existing config under the name it already has. The one exception is a `.ts` config in a `"type": "commonjs"` package, which Node can't load: init renames it to `.mts` and says so. `ultracite doctor`, linter detection and the stale-config cleanup all recognise the `.mts` names. `doctor` fails a `.ts` config in a CommonJS package, and fails when a `.ts` and an `.mts` config sit side by side.

Requires oxfmt >= 0.59.0, the first release that finds `oxfmt.config.mts` on its own.
