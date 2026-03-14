import { readFile, writeFile } from "node:fs/promises";

import { exists } from "../utils";

// All possible Prettier config file locations
// https://prettier.io/docs/en/configuration.html
const prettierConfigPaths = [
  // JS/TS configs (ESM)
  "./.prettierrc.mjs",
  "./prettier.config.mjs",
  "./.prettierrc.mts",
  "./prettier.config.mts",
  // JS/TS configs (CJS)
  "./.prettierrc.cjs",
  "./prettier.config.cjs",
  "./.prettierrc.cts",
  "./prettier.config.cts",
  // JS/TS configs (depends on package.json type)
  "./.prettierrc.js",
  "./prettier.config.js",
  "./.prettierrc.ts",
  "./prettier.config.ts",
  // JSON/YAML configs
  "./.prettierrc",
  "./.prettierrc.json",
  "./.prettierrc.json5",
  "./.prettierrc.yml",
  "./.prettierrc.yaml",
  // TOML config
  "./.prettierrc.toml",
] as const;

const defaultConfigPath = "./prettier.config.mjs";

const hasPrettierKeyInPackageJson = async (): Promise<boolean> => {
  try {
    const packageJson = JSON.parse(await readFile("./package.json", "utf8"));
    return "prettier" in packageJson;
  } catch {
    return false;
  }
};

const getPrettierConfigPath = async (): Promise<string | null> => {
  // Check for "prettier" key in package.json first
  if (await hasPrettierKeyInPackageJson()) {
    return "./package.json";
  }

  // Check for config files
  for (const path of prettierConfigPaths) {
    if (await exists(path)) {
      return path;
    }
  }

  return null;
};

const generatePrettierConfig =
  (): string => `export { default } from "ultracite/prettier";
`;

export const prettier = {
  create: async () => {
    const config = generatePrettierConfig();
    await writeFile(defaultConfigPath, config);
  },
  exists: async () => {
    const path = await getPrettierConfigPath();
    return path !== null;
  },
  update: async () => {
    const config = generatePrettierConfig();
    await writeFile(defaultConfigPath, config);
  },
};
