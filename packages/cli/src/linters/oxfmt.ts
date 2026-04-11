import { readFile, writeFile } from "node:fs/promises";

import { exists } from "../utils";

const oxfmtConfigPath = "./oxfmt.config.ts";

// oxfmt configuration matching Ultracite's formatting standards
// https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
const defaultConfig = {
  arrowParens: "always" as const,
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: "lf" as const,
  sortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc" as const,
  },
  sortPackageJson: true,
  jsxSingleQuote: false,
  printWidth: 80,
  quoteProps: "as-needed" as const,
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5" as const,
  useTabs: false,
};

const generateConfigContent = (config: Record<string, unknown>) =>
  `import { defineConfig } from "oxfmt";

export default defineConfig(${JSON.stringify(config, null, 2)});
`;

export const oxfmt = {
  create: async () =>
    await writeFile(oxfmtConfigPath, generateConfigContent(defaultConfig)),
  exists: async () => await exists(oxfmtConfigPath),
  update: async () => {
    const existingContents = await readFile(oxfmtConfigPath, "utf-8");

    // Extract the config object from existing TS file
    const configMatch = existingContents.match(
      /defineConfig\(([\s\S]*)\);?\s*$/
    );

    let existingConfig: Record<string, unknown> = {};

    if (configMatch?.[1]) {
      try {
        // Try to parse the JSON-like object from defineConfig(...)
        existingConfig = JSON.parse(configMatch[1]) as Record<string, unknown>;
      } catch {
        // If parsing fails, treat as empty config
        existingConfig = {};
      }
    }

    // Merge: default config values take precedence, but preserve user's custom options
    const newConfig = { ...existingConfig, ...defaultConfig };

    await writeFile(oxfmtConfigPath, generateConfigContent(newConfig));
  },
};
