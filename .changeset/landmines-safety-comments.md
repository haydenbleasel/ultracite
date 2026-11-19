---
"ultracite": patch
---

The `landmines` Oxlint preset now allows `// SAFETY:` comments, so it can be extended together with `anti-slop`. `anti-slop/require-safety-comment-for-type-assertion` requires that comment on every type assertion and `landmines-style/no-comments` used to report it, which left no way for an assertion to pass both presets. [`@interfere/landmines` 0.1.1](https://github.com/interfere-inc/landmines/releases/tag/%40interfere/landmines%400.1.1) added an `allow` option for the comment prefixes to keep ([interfere-inc/landmines#4](https://github.com/interfere-inc/landmines/issues/4)), and the preset sets it to `["WARNING", "SAFETY"]`. If you turned one of the two rules off to work around the clash, you can turn it back on.

Requires `@interfere/landmines` >= 0.1.1. `ultracite upgrade` installs it, and `ultracite doctor` reports an older version.

The same release widens four testing rules, so a project on the preset may see new errors after upgrading: `no-fixed-sleep` now reports timer callbacks with a block body and sleeps inside `act`, `waitFor` and promise callbacks, `no-flake-masking` reports `testTimeout` and `hookTimeout` in a Vitest config, and `no-unsignaled-poll` reports `expect.poll` chains that end in a spy matcher. `strict-msw` accepts more valid setups than before.
