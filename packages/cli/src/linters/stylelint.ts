import { readFile, rm } from "node:fs/promises";

import { log } from "@clack/prompts";

import { readPackageJsonSync } from "../schemas";
import {
  canHoldEsmConfig,
  editPackageJson,
  exists,
  stylelintConfigNames,
  writeProjectFile,
} from "../utils";

const packageJsonPath = "./package.json";

const stylelintConfigPaths = stylelintConfigNames.map((name) => `./${name}`);

const defaultConfigPath = "./stylelint.config.mjs";

const ULTRACITE_STYLELINT = "ultracite/stylelint";

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

const warnReplaced = (source: string, target: string): void => {
  log.warn(
    `Replaced ${source} with ${target}, which uses Ultracite's Stylelint config. Its previous settings were not carried over; recover anything you need from version control.`
  );
};

export const stylelint = {
  create: async () => {
    const config = generateStylelintConfig();
    await writeProjectFile(defaultConfigPath, config);
  },
  exists: () => {
    const path = getStylelintConfigPath();
    return path !== null;
  },
  // A config that already uses Ultracite's (it re-exports or extends
  // ultracite/stylelint, perhaps with overrides of its own) is left as it is:
  // the generated config holds nothing it could be missing.
  update: async () => {
    const existingPath = getStylelintConfigPath() ?? defaultConfigPath;

    if (existingPath === packageJsonPath) {
      const existing = readPackageJsonSync(packageJsonPath)?.stylelint;

      if (JSON.stringify(existing).includes(ULTRACITE_STYLELINT)) {
        return;
      }

      // Stylelint reads the package.json key before any config file, so the
      // new file only takes effect once the key is gone.
      await writeProjectFile(defaultConfigPath, generateStylelintConfig());
      await editPackageJson((manifest) => {
        delete manifest.stylelint;
        return true;
      });
      warnReplaced(
        'the "stylelint" key in package.json',
        defaultConfigPath.slice(2)
      );
      return;
    }

    const contents = await readFile(existingPath, "utf-8");

    if (contents.includes(ULTRACITE_STYLELINT)) {
      return;
    }

    // Only overwrite a config file that can hold the generated ESM module;
    // JSON/YAML/CJS configs get the default .mjs file instead, and the stale
    // file is removed so Stylelint's config resolution doesn't keep picking
    // it up over the new one.
    const targetPath = canHoldEsmConfig(existingPath)
      ? existingPath
      : defaultConfigPath;
    await writeProjectFile(targetPath, generateStylelintConfig());

    if (existingPath !== targetPath) {
      await rm(existingPath, { force: true });
    }

    warnReplaced(existingPath.slice(2), targetPath.slice(2));
  },
};
