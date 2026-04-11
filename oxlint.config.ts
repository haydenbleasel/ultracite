import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [
    "./packages/cli/config/oxlint/core/oxlint.config.ts",
    "./packages/cli/config/oxlint/react/oxlint.config.ts",
    "./packages/cli/config/oxlint/next/oxlint.config.ts",
    "./packages/cli/config/oxlint/vitest/oxlint.config.ts",
  ],
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
  rules: {
    "max-statements": "off",
    complexity: "off",
  },
  overrides: [
    {
      files: ["packages/cli/src/oxlint.ts"],
      rules: {
        "sort-keys": "off",
      },
    },
  ],
});
