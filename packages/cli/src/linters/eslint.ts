import { writeFile } from "node:fs/promises";
import type { options } from "@ultracite/data/options";
import { exists } from "../utils";

// All possible ESLint flat config file locations
// https://eslint.org/docs/latest/use/configure/configuration-files
const eslintConfigPaths = [
  "./eslint.config.mjs",
  "./eslint.config.js",
  "./eslint.config.cjs",
  "./eslint.config.ts",
  "./eslint.config.mts",
  "./eslint.config.cts",
] as const;

const defaultConfigPath = "./eslint.config.mjs";

const getEslintConfigPath = async (): Promise<string | null> => {
  for (const path of eslintConfigPaths) {
    if (await exists(path)) {
      return path;
    }
  }
  return null;
};

interface EslintOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

const generateEslintConfig = (opts?: EslintOptions): string => {
  const imports: string[] = ['import core from "ultracite/eslint/core";'];
  const configs: string[] = ["...core"];

  // Add framework-specific configs
  if (opts?.frameworks && opts.frameworks.length > 0) {
    for (const framework of opts.frameworks) {
      imports.push(`import ${framework} from "ultracite/eslint/${framework}";`);
      configs.push(`...${framework}`);
    }
  }

  return `${imports.join("\n")}

export default [
  ${configs.join(",\n  ")},
];
`;
};

export const eslint = {
  exists: async () => {
    const path = await getEslintConfigPath();
    return path !== null;
  },
  create: async (opts?: EslintOptions) => {
    const config = generateEslintConfig(opts);
    await writeFile(defaultConfigPath, config);
  },
  update: async (opts?: EslintOptions) => {
    const config = generateEslintConfig(opts);
    await writeFile(defaultConfigPath, config);
  },
};
