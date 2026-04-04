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

// Frameworks that have dedicated Prettier plugins
const prettierPluginFrameworks = ["svelte", "astro"] as const;
type PrettierPluginFramework = (typeof prettierPluginFrameworks)[number];

const isPrettierPluginFramework = (f: string): f is PrettierPluginFramework =>
  prettierPluginFrameworks.includes(f as PrettierPluginFramework);

const generatePrettierConfig = (
  frameworks: (typeof options.frameworks)[number][] = []
): string => {
  const relevantFrameworks = frameworks.filter(isPrettierPluginFramework);

  if (relevantFrameworks.length === 0) {
    return `export { default } from "ultracite/prettier";\n`;
  }

  const imports = relevantFrameworks
    .map((f) => `import ${f} from "ultracite/prettier/${f}";`)
    .join("\n");

  if (relevantFrameworks.length === 1) {
    const [fw] = relevantFrameworks;
    return `import core from "ultracite/prettier/core";
${imports}

export default {
  ...core,
  ...${fw},
};
`;
  }

  // Multiple frameworks — spread all and explicitly merge plugins arrays
  const spreads = relevantFrameworks.map((f) => `  ...${f},`).join("\n");
  const pluginMerge = relevantFrameworks
    .map((f) => `...(${f}.plugins ?? [])`)
    .join(", ");

  return `import core from "ultracite/prettier/core";
${imports}

export default {
  ...core,
${spreads}
  plugins: [${pluginMerge}],
};
`;
};

export const prettier = {
  create: async (frameworks: (typeof options.frameworks)[number][] = []) => {
    const config = generatePrettierConfig(frameworks);
    await writeFile(defaultConfigPath, config);
  },
  exists: async () => {
    const path = await getPrettierConfigPath();
    return path !== null;
  },
  update: async (frameworks: (typeof options.frameworks)[number][] = []) => {
    const config = generatePrettierConfig(frameworks);
    await writeFile(defaultConfigPath, config);
  },
};
