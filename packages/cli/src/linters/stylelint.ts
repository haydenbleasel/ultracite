import { readFile, writeFile } from "node:fs/promises";
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

const hasStylelintKeyInPackageJson = async (): Promise<boolean> => {
  try {
    const packageJson = JSON.parse(await readFile("./package.json", "utf-8"));
    return "stylelint" in packageJson;
  } catch {
    return false;
  }
};

const getStylelintConfigPath = async (): Promise<string | null> => {
  // Check for "stylelint" key in package.json first
  if (await hasStylelintKeyInPackageJson()) {
    return "./package.json";
  }

  // Check for config files
  for (const path of stylelintConfigPaths) {
    if (await exists(path)) {
      return path;
    }
  }

  return null;
};

const generateStylelintConfig = (): string => {
  return `export { default } from "ultracite/stylelint";
`;
};

export const stylelint = {
  exists: async () => {
    const path = await getStylelintConfigPath();
    return path !== null;
  },
  create: async () => {
    const config = generateStylelintConfig();
    await writeFile(defaultConfigPath, config);
  },
  update: async () => {
    const config = generateStylelintConfig();
    await writeFile(defaultConfigPath, config);
  },
};
