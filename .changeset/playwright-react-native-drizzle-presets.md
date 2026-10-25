---
"ultracite": patch
---

Add `playwright`, `react-native` and `drizzle` framework presets. `ultracite init` offers them, and pre-selects them when the project depends on `@playwright/test`, `react-native` or `drizzle-orm` (React Native also pre-selects React). Their rules are Biome's, which Biome 2.6 made stable. The Oxlint and ESLint presets are empty, and keep the framework selectable with every linter, as the Cypress preset does on Oxlint and Biome.

- `ultracite/biome/playwright` turns on Biome's Playwright rules, such as `noPlaywrightMissingAwait`, `noPlaywrightWaitForTimeout` and `noPlaywrightPagePause`, and the test rules the Jest and Vitest presets use, such as `noFocusedTests` and `useExpect`. It leaves out `useConsistentTestIt`, because Playwright has no `it()`.
- `ultracite/biome/react-native` turns on `noReactNativeRawText`, `noReactNativeLiteralColors`, `noReactNativeDeepImports` and `useReactNativePlatformComponents`, and declares the `__DEV__` global.
- `ultracite/biome/drizzle` turns on `noDrizzleDeleteWithoutWhere` and `noDrizzleUpdateWithoutWhere` for objects named `db` or `tx`. The rules report nothing without a name to look for.

These rules check their libraries' APIs and would misfire elsewhere, which is why they're in presets rather than in core. For example, `noReactNativeRawText` reports text inside any JSX element, including a `<div>`.
