import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { readFile, writeFile } from "node:fs/promises";

import { exists } from "../utils";

const oxfmtConfigPath = "./.oxfmtrc.jsonc";

// oxfmt configuration matching Ultracite's formatting standards
// https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
const defaultConfig = {
  $schema: "./node_modules/oxfmt/configuration_schema.json",
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: "lf",
  experimentalSortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc",
  },
  experimentalSortPackageJson: true,
  jsxSingleQuote: false,
  printWidth: 80,
  quoteProps: "as-needed",
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  useTabs: false,
};

export const oxfmt = {
  create: async () => {
    const configContent = `// Ultracite oxfmt Configuration
// https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
${JSON.stringify(defaultConfig, null, 2)}
`;
    return await writeFile(oxfmtConfigPath, configContent);
  },
  exists: async () => await exists(oxfmtConfigPath),
  update: async () => {
    const existingContents = await readFile(oxfmtConfigPath, "utf8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToWork = existingConfig || {};

    const newConfig = deepmerge(configToWork, defaultConfig);

    const configContent = `// Ultracite oxfmt Configuration
// https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
${JSON.stringify(newConfig, null, 2)}
`;
    await writeFile(oxfmtConfigPath, configContent);
  },
};
