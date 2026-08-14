import { defineConfig } from "oxfmt";

import base from "./packages/cli/config/oxfmt/index.mjs";

export default defineConfig({
  ...base,
  ignorePatterns: [
    "packages/design-system/components/ui",
    "packages/design-system/components/kibo-ui",
    "packages/design-system/lib/utils.ts",
    "packages/design-system/hooks/use-mobile.ts",
    "packages/cli/config/biome",
    "benchmark/fixtures",
    "benchmark/.work",
    "**/CHANGELOG.md",
    "packages/video/src/components",
    "packages/video/src/lib/utils.ts",
    "packages/video/src/lib/remocn-ui",
    "packages/video/.agents/skills",
    // Generated bundle of the vendored anti-slop oxlint plugin — see
    // packages/cli/scripts/vendor-anti-slop.ts.
    "packages/cli/config/oxlint/anti-slop/plugin.mjs",
  ],
});
