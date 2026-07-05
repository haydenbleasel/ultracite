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
    "test",
    "**/CHANGELOG.md",
  ],
});
