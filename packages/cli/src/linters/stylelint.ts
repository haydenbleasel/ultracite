import { readPackageJsonSync } from "../schemas";
import { exists, stylelintConfigNames, writeProjectFile } from "../utils";

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
    await writeProjectFile(
      existingPath === packageJsonPath
        ? defaultConfigPath
        : (existingPath ?? defaultConfigPath),
      config
    );
  },
};
