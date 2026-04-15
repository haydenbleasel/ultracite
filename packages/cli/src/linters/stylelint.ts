import { writeFile } from "node:fs/promises";

import { readPackageJsonSync } from "../schemas";
import { exists } from "../utils";

// All possible Stylelint config file locations
// https://stylelint.io/user-guide/configure
const stylelintConfigPaths = [
  // JS configs (ESM)
  "./.stylelintrc.mjs",
  "./stylelint.config.mjs",
  // JS configs (CJS)
  "./.stylelintrc.cjs",
  "./stylelint.config.cjs",
  // JS configs (depends on package.json type)
  "./.stylelintrc.js",
  "./stylelint.config.js",
  // JSON/YAML configs
  "./.stylelintrc",
  "./.stylelintrc.json",
  "./.stylelintrc.yml",
  "./.stylelintrc.yaml",
] as const;

const defaultConfigPath = "./stylelint.config.mjs";

const hasStylelintKeyInPackageJson = (): boolean => {
  const packageJson = readPackageJsonSync("./package.json");
  return packageJson?.stylelint !== undefined;
};

const getStylelintConfigPath = (): string | null => {
  // Check for "stylelint" key in package.json first
  if (hasStylelintKeyInPackageJson()) {
    return "./package.json";
  }

  // Check for config files
  for (const path of stylelintConfigPaths) {
    if (exists(path)) {
      return path;
    }
  }

  return null;
};

const generateStylelintConfig =
  (): string => `export { default } from "ultracite/stylelint";
`;

export const stylelint = {
  create: async () => {
    const config = generateStylelintConfig();
    await writeFile(defaultConfigPath, config);
  },
  exists: () => {
    const path = getStylelintConfigPath();
    return path !== null;
  },
  update: async () => {
    const config = generateStylelintConfig();
    await writeFile(defaultConfigPath, config);
  },
};
