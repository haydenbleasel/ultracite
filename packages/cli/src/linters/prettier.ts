import { writeFile } from "node:fs/promises";

import type { options } from "@repo/data/options";

import { readPackageJsonSync } from "../schemas";
import { exists, validateFrameworkName } from "../utils";

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

const hasPrettierKeyInPackageJson = (): boolean => {
  const packageJson = readPackageJsonSync("./package.json");
  return packageJson?.prettier !== undefined;
};

const getPrettierConfigPath = (): string | null => {
  // Check for "prettier" key in package.json first
  if (hasPrettierKeyInPackageJson()) {
    return "./package.json";
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
    await writeFile(defaultConfigPath, config);
  },
  exists: () => {
    const path = getPrettierConfigPath();
    return path !== null;
  },
  update: async (opts?: PrettierOptions) => {
    const config = generatePrettierConfig(opts);
    await writeFile(defaultConfigPath, config);
  },
};
