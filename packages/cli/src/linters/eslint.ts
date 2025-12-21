import { readFile, writeFile } from "node:fs/promises";
import type { options } from "../consts/options";
import { exists } from "../utils";

const eslintConfigPaths = [
  "./eslint.config.mjs",
  "./eslint.config.js",
  "./eslint.config.cjs",
  "./eslint.config.ts",
  "./eslint.config.mts",
  "./eslint.config.cts",
] as const;

const getEslintConfigPath = async (): Promise<string> => {
  for (const path of eslintConfigPaths) {
    if (await exists(path)) {
      return path;
    }
  }
  // Default to mjs for new configs
  return "./eslint.config.mjs";
};

interface EslintOptions {
  frameworks?: (typeof options.frameworks)[number][];
}

const generateEslintConfig = (opts?: EslintOptions): string => {
  const imports: string[] = ['import ultracite from "ultracite/eslint";'];
  const configs: string[] = ["...ultracite.core"];

  // Add framework-specific configs
  if (opts?.frameworks && opts.frameworks.length > 0) {
    for (const framework of opts.frameworks) {
      configs.push(`...ultracite.${framework}`);
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
    return exists(path);
  },
  create: async (opts?: EslintOptions) => {
    const path = await getEslintConfigPath();
    const config = generateEslintConfig(opts);
    return writeFile(path, config);
  },
  update: async (opts?: EslintOptions) => {
    const path = await getEslintConfigPath();
    const existingContents = await readFile(path, "utf-8");

    // Check if ultracite is already imported
    if (existingContents.includes("ultracite/eslint")) {
      // Already configured, check if we need to add framework configs
      if (opts?.frameworks && opts.frameworks.length > 0) {
        let updatedContents = existingContents;
        for (const framework of opts.frameworks) {
          const frameworkConfig = `...ultracite.${framework}`;
          if (!updatedContents.includes(frameworkConfig)) {
            // Add framework config before the closing bracket
            updatedContents = updatedContents.replace(
              /(\];\s*)$/,
              `  ${frameworkConfig},\n$1`
            );
          }
        }
        await writeFile(path, updatedContents);
      }
      return;
    }

    // If no ultracite import, create a new config
    const config = generateEslintConfig(opts);
    await writeFile(path, config);
  },
};
