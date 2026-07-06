import type { options } from "../data/options";
import { readPackageJsonSync } from "../schemas";
import {
  exists,
  prettierConfigNames,
  validateFrameworkName,
  writeProjectFile,
} from "../utils";

const packageJsonPath = "./package.json";

const prettierConfigPaths = prettierConfigNames.map((name) => `./${name}`);

const defaultConfigPath = "./prettier.config.mjs";

const hasPrettierKeyInPackageJson = (): boolean => {
  const packageJson = readPackageJsonSync(packageJsonPath);
  return packageJson?.prettier !== undefined;
};

const getPrettierConfigPath = (): string | null => {
  // Check for "prettier" key in package.json first
  if (hasPrettierKeyInPackageJson()) {
    return packageJsonPath;
  }

  // Check for config files
  for (const path of prettierConfigPaths) {
    if (exists(path)) {
      return path;
    }
  }

  return null;
};

const frameworkPlugins: Record<string, string> = {
  astro: "prettier-plugin-astro",
  svelte: "prettier-plugin-svelte",
};

interface PrettierOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

const generatePrettierConfig = (opts?: PrettierOptions): string => {
  const plugins: string[] = [];

  if (opts?.frameworks) {
    for (const fw of opts.frameworks) {
      const name = validateFrameworkName(fw);
      if (name in frameworkPlugins) {
        plugins.push(frameworkPlugins[name]);
      }
    }
  }

  // Tailwind CSS plugin is always included and must be last
  plugins.push("prettier-plugin-tailwindcss");

  return `import config from "ultracite/prettier";

export default {
  ...config,
  plugins: [${plugins.map((p) => `"${p}"`).join(", ")}],
};
`;
};

export const prettier = {
  create: async (opts?: PrettierOptions) => {
    const config = generatePrettierConfig(opts);
    await writeProjectFile(defaultConfigPath, config);
  },
  exists: () => {
    const path = getPrettierConfigPath();
    return path !== null;
  },
  update: async (opts?: PrettierOptions) => {
    const config = generatePrettierConfig(opts);
    const existingPath = getPrettierConfigPath();
    await writeProjectFile(
      existingPath === packageJsonPath
        ? defaultConfigPath
        : (existingPath ?? defaultConfigPath),
      config
    );
  },
};
