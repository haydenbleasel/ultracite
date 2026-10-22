import { defineConfig } from "oxlint";

import antislop from "./packages/cli/config/oxlint/anti-slop/index.mjs";
import astro from "./packages/cli/config/oxlint/astro/index.mjs";
import core from "./packages/cli/config/oxlint/core/index.mjs";
import react from "./packages/cli/config/oxlint/react/index.mjs";

export default defineConfig({
  // oxlint doesn't carry `env` through `extends`.
  env: core.env,
  extends: [core, react, astro, antislop],
  ignorePatterns: [
    "packages/design-system/components/ui",
    "packages/design-system/components/kibo-ui",
    "packages/design-system/lib/utils.ts",
    "packages/design-system/hooks/use-mobile.ts",
    "packages/cli/config/biome",
    "test",
    "benchmark/fixtures",
    "benchmark/.work",
    // Vendored anti-slop oxlint plugin (generated bundle plus its
    // declaration) — see packages/cli/scripts/vendor-anti-slop.ts.
    "packages/cli/config/oxlint/anti-slop/plugin.mjs",
    "packages/cli/config/oxlint/anti-slop/plugin.d.mts",
    // Deliberately violates anti-slop rules so the plugin load test can
    // assert the vendored plugin's diagnostics actually fire.
    "packages/cli/__tests__/fixtures/anti-slop-load",
    // Deliberately violates the @shadcn/lint rules so the plugin load test
    // can assert the design-system diagnostics actually fire.
    "packages/cli/__tests__/fixtures/shadcn-load",
    // Deliberately forges and leaks gdp-ts proofs so the plugin load test can
    // assert the gdp diagnostics actually fire.
    "packages/cli/__tests__/fixtures/gdp-load",
    // Deliberately contains missing docs and malformed TSDoc so the opt-in
    // public API and TSDoc rules can assert their diagnostics.
    "packages/cli/__tests__/fixtures/jsdoc-load",
    // Deliberately uses TanStack route filenames (`$.tsx`, `__root.tsx`) and a
    // PascalCase component so the route override test can assert on both.
    "packages/cli/__tests__/fixtures/route-filenames",
    // Deliberately uses Astro's bracketed page-route filenames and an invalid
    // component filename for the JS-plugin override test.
    "packages/cli/__tests__/fixtures/astro-route-filenames",
    // Deliberately uses CommonJS in Astro frontmatter so the astro override
    // test can assert the backfilled rules still fire.
    "packages/cli/__tests__/fixtures/astro-prefer-module",
    // Deliberately passes strings to timers so the env test can assert
    // no-implied-eval fires through the config init writes.
    "packages/cli/__tests__/fixtures/implied-eval",
    // Deliberately initializes with `undefined` so the test can assert
    // no-useless-undefined still fires once call arguments are skipped.
    "packages/cli/__tests__/fixtures/useless-undefined",
    // Deliberately leaves a promise chain unhandled so the test can assert
    // catch-or-return fires once prefer-await-to-then is off.
    "packages/cli/__tests__/fixtures/promise-chains",
    // Blog research harnesses (see research/README.md). The fixtures are
    // third-party code, deliberately complex cases and agent output, and the
    // results are generated. The scripts aren't shipped, and lint autofixes
    // (sorted keys, rewritten regexes) would change their output, which has to
    // stay byte-for-byte reproducible.
    "research",
  ],
  overrides: [
    {
      files: [
        "packages/cli/src/oxlint.ts",
        "packages/cli/config/oxlint/**/*.mjs",
      ],
      rules: {
        "sort-keys": "off",
      },
    },
  ],
  rules: {
    complexity: "off",
    "max-statements": "off",
  },
});
