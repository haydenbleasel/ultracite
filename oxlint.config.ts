import { defineConfig } from "oxlint";

import core from "./packages/cli/config/oxlint/core/index.js";
import next from "./packages/cli/config/oxlint/next/index.js";
import react from "./packages/cli/config/oxlint/react/index.js";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [
    "packages/design-system/components/ui",
    "packages/design-system/components/kibo-ui",
    "packages/design-system/lib/utils.ts",
    "packages/design-system/hooks/use-mobile.ts",
    "apps/web/components/ai-elements",
    "apps/web/components/ui",
    "apps/web/lib/utils.ts",
    "apps/web/hooks/use-mobile.ts",
    "packages/cli/config/biome",
    "test",
  ],
  overrides: [
    {
      files: [
        "packages/cli/src/oxlint.ts",
        "packages/cli/config/oxlint/**/*.js",
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
