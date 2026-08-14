import { defineConfig } from "oxlint";

import antislop from "./packages/cli/config/oxlint/anti-slop/index.mjs";
import astro from "./packages/cli/config/oxlint/astro/index.mjs";
import core from "./packages/cli/config/oxlint/core/index.mjs";
import react from "./packages/cli/config/oxlint/react/index.mjs";

export default defineConfig({
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
    // Vendored remocn registry components (shadcn-style) in the video package
    // are upstream content, not project source; linting them just diverges
    // from upstream and gets clobbered on the next registry update.
    "packages/video/src/components",
    "packages/video/src/lib/utils.ts",
    "packages/video/src/lib/remocn-ui",
    "packages/video/.agents/skills",
    // Vendored anti-slop oxlint plugin (generated bundle plus its
    // declaration) — see packages/cli/scripts/vendor-anti-slop.ts.
    "packages/cli/config/oxlint/anti-slop/plugin.mjs",
    "packages/cli/config/oxlint/anti-slop/plugin.d.mts",
    // Deliberately violates anti-slop rules so the plugin load test can
    // assert the vendored plugin's diagnostics actually fire.
    "packages/cli/__tests__/fixtures/anti-slop-load",
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
