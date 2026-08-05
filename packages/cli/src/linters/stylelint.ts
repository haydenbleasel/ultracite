import { rm } from "node:fs/promises";

import { readPackageJsonSync } from "../schemas";
import {
  canHoldEsmConfig,
  exists,
  stylelintConfigNames,
  writeProjectFile,
} from "../utils";

const packageJsonPath = "./package.json";

const stylelintConfigPaths = stylelintConfigNames.map((name) => `./${name}`);

const defaultConfigPath = "./stylelint.config.mjs";

const hasStylelintKeyInPackageJson = (): boolean => {
  const packageJson = readPackageJsonSync(packageJsonPath);
  return packageJson?.stylelint !== undefined;
};

const getStylelintConfigPath = (): string | null => {
  // Check for "stylelint" key in package.json first
  if (hasStylelintKeyInPackageJson()) {
    return packageJsonPath;
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
    await writeProjectFile(defaultConfigPath, config);
  },
  exists: () => {
    const path = getStylelintConfigPath();
    return path !== null;
  },
  update: async () => {
    const config = generateStylelintConfig();
    const existingPath = getStylelintConfigPath();
    const existingFile = existingPath === packageJsonPath ? null : existingPath;

    // Only overwrite a config file that can hold the generated ESM module;
    // JSON/YAML/CJS configs get the default .mjs file instead, and the stale
    // file is removed so Stylelint's config resolution doesn't keep picking
    // it up over the new one.
    const targetPath =
      existingFile && canHoldEsmConfig(existingFile)
        ? existingFile
        : defaultConfigPath;
    await writeProjectFile(targetPath, config);

    if (existingFile && existingFile !== targetPath) {
      await rm(existingFile, { force: true });
    }
  },
};
