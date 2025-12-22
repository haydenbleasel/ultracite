import { readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { parse } from "jsonc-parser";
import { exists } from "../utils";

const oxfmtConfigPath = "./.oxfmtrc.jsonc";

// oxfmt configuration matching Ultracite's formatting standards
// https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
const defaultConfig = {
  $schema: "./node_modules/oxfmt/configuration_schema.json",
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",
  experimentalSortPackageJson: true,
  experimentalSortImports: {
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc",
  },
};

export const oxfmt = {
  exists: async () => {
    return await exists(oxfmtConfigPath);
  },
  create: async () => {
    const configContent = `// Ultracite oxfmt Configuration
// https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
${JSON.stringify(defaultConfig, null, 2)}
`;
    return await writeFile(oxfmtConfigPath, configContent);
  },
  update: async () => {
    const existingContents = await readFile(oxfmtConfigPath, "utf-8");
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
