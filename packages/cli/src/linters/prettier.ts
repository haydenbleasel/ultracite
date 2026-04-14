import { readFile, writeFile } from "node:fs/promises";

import type { options } from "@repo/data/options";

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
    const packageJson = JSON.parse(await readFile("./package.json", "utf-8"));
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
      if (fw in frameworkPlugins) {
        plugins.push(frameworkPlugins[fw]);
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
  exists: async () => {
    const path = await getPrettierConfigPath();
    return path !== null;
  },
  update: async (opts?: PrettierOptions) => {
    const config = generatePrettierConfig(opts);
    await writeFile(defaultConfigPath, config);
  },
};
