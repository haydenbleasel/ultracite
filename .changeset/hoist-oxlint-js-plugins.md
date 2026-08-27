---
"ultracite": patch
---

Re-declare selected Oxlint JS plugins on the root config so dependency analyzers see them. `ultracite init --linter oxlint --js-plugins ...` now generates `const jsPlugins = selectJsPlugins([...])` and adds `jsPlugins: jsPlugins.jsPlugins` to the root config (also when the full `ultracite/oxlint/js-plugins` preset is extended). Knip only resolves `jsPlugins` from the root Oxlint config and never walks `extends`, so `eslint-plugin-github`, `eslint-plugin-sonarjs`, and `oxlint-plugin-react-doctor` were reported as unused devDependencies. Oxlint dedupes the plugin between the root and the extended preset, so linting is unchanged.

Also fix `ultracite update` dropping the `js-plugins` preset from `extends` when the config used the documented `import jsPlugins, { jsPluginSettings } from "ultracite/oxlint/js-plugins"` form: the import parser only matched bare default imports. The regenerated full-preset config keeps `settings: jsPluginSettings` on the root as well.
