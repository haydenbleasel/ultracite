---
"ultracite": patch
---

Fold the github and sonarjs rules into the oxlint core preset. The standalone `ultracite/oxlint/github` and `ultracite/oxlint/sonarjs` presets are removed — ultracite ships framework presets, not individual plugins. Their rules now live in `ultracite/oxlint/core`, so every oxlint setup gets eslint-plugin-github and eslint-plugin-sonarjs through oxlint's JS plugin bridge, matching how the ESLint preset already bundles them into core.

This is a breaking change to generated configs: `ultracite/oxlint/github` and `ultracite/oxlint/sonarjs` no longer exist. Re-run `ultracite init` to regenerate `oxlint.config.ts`.

Also fixed: nine sonarjs rules (`async-test-assertions`, `hooks-before-test-cases`, `no-duplicate-test-title`, `no-empty-test-title`, `no-floating-point-equality`, `no-forced-browser-interaction`, `no-trivial-assertions`, `prefer-specific-assertions`, `super-linear-regex`) that exist in eslint-plugin-sonarjs but that oxlint's JS plugin bridge does not register. Naming them made oxlint hard-fail config parsing, which broke `ultracite fix`/`check` for oxlint projects using the sonarjs preset. They are omitted from oxlint core (still enabled in the ESLint preset), and a test now runs oxlint against core to catch this class of regression.

The React Doctor, github, and sonarjs plugins are installed into your project's devDependencies at init (as the ESLint plugins already were), rather than bundled as dependencies of ultracite — oxlint resolves JS plugin specifiers from the project root, so they must be installed there directly.
