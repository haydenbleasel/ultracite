import { defineConfig } from "oxfmt";

import { ignorePatterns } from "../shared/ignores.mjs";

export default defineConfig({
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: "lf",
  ignorePatterns,
  jsxSingleQuote: false,
  printWidth: 80,
  quoteProps: "as-needed",
  semi: true,
  singleQuote: false,
  sortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc",
  },
  sortPackageJson: true,
  tabWidth: 2,
  trailingComma: "es5",
  useTabs: false,
});
