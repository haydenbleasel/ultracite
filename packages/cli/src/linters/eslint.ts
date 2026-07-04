import type { options } from "@repo/data/options";

import {
  eslintConfigNames,
  exists,
  validateFrameworkName,
  writeProjectFile,
} from "../utils";

const eslintConfigPaths = eslintConfigNames.map((name) => `./${name}`);

const defaultConfigPath = "./eslint.config.mjs";

const getEslintConfigPath = (): string | null => {
  for (const path of eslintConfigPaths) {
    if (exists(path)) {
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
      const name = validateFrameworkName(framework);
      imports.push(`import ${name} from "ultracite/eslint/${name}";`);
      configs.push(`...${name}`);
    }
  }

  return `${imports.join("\n")}

export default [
  ${configs.join(",\n  ")},
];
`;
};

export const eslint = {
  create: async (opts?: EslintOptions) => {
    const config = generateEslintConfig(opts);
    await writeProjectFile(defaultConfigPath, config);
  },
  exists: () => {
    const path = getEslintConfigPath();
    return path !== null;
  },
  update: async (opts?: EslintOptions) => {
    const config = generateEslintConfig(opts);
    await writeProjectFile(getEslintConfigPath() ?? defaultConfigPath, config);
  },
};
