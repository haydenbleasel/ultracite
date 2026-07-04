---
"ultracite": minor
---

Add [React Doctor](https://www.react.doctor) rules to the ESLint and Oxlint React, Next.js, and TanStack presets. This enables React Doctor's own rules — the "You Might Not Need an Effect" family (`no-fetch-in-effect`, `no-derived-state`, `no-mirror-prop-effect`, etc.) plus its render-performance, hydration, server-component, security, and framework-specific rules — via `eslint-plugin-react-doctor` and the `oxlint-plugin-react-doctor` JS plugin. Rules that React Doctor ports from `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-jsx-a11y` are intentionally left off to avoid duplicate diagnostics with the plugins Ultracite already ships.
