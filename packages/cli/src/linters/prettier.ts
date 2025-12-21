import { readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { exists } from "../utils";

const prettierConfigPaths = [
  "./prettier.config.mjs",
  "./prettier.config.js",
  "./prettier.config.cjs",
  "./.prettierrc",
  "./.prettierrc.json",
  "./.prettierrc.js",
  "./.prettierrc.cjs",
  "./.prettierrc.mjs",
] as const;

const getPrettierConfigPath = async (): Promise<string> => {
  for (const path of prettierConfigPaths) {
    if (await exists(path)) {
      return path;
    }
  }
  // Default to mjs for new configs (consistent with ESLint)
  return "./prettier.config.mjs";
};

const defaultConfig = {
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80,
  useTabs: false,
  endOfLine: "lf",
  bracketSpacing: true,
  arrowParens: "always",
};

const generatePrettierConfig = (): string => {
  return `// Ultracite Prettier Configuration
// https://prettier.io/docs/en/configuration.html

/** @type {import("prettier").Config} */
export default ${JSON.stringify(defaultConfig, null, 2)};
`;
};

export const prettier = {
  exists: async () => {
    const path = await getPrettierConfigPath();
    return await exists(path);
  },
  create: async () => {
    const path = await getPrettierConfigPath();

    // For JS/MJS configs, generate the module format
    if (path.endsWith(".mjs") || path.endsWith(".js")) {
      const config = generatePrettierConfig();
      return await writeFile(path, config);
    }

    // For JSON configs
    return await writeFile(path, JSON.stringify(defaultConfig, null, 2));
  },
  update: async () => {
    const path = await getPrettierConfigPath();

    // For JS/MJS configs, just overwrite
    if (
      path.endsWith(".mjs") ||
      path.endsWith(".js") ||
      path.endsWith(".cjs")
    ) {
      const config = generatePrettierConfig();
      return await writeFile(path, config);
    }

    // For JSON configs, merge
    try {
      const existingContents = await readFile(path, "utf-8");
      const existingConfig = JSON.parse(existingContents) as Record<
        string,
        unknown
      >;
      const newConfig = deepmerge(existingConfig, defaultConfig);
      await writeFile(path, JSON.stringify(newConfig, null, 2));
    } catch {
      // If parsing fails, create a new config
      await writeFile(path, JSON.stringify(defaultConfig, null, 2));
    }
  },
};
