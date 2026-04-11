import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "es5",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",
  sortPackageJson: true,
  sortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc",
  },
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
});
