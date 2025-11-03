import { readFile, writeFile } from "node:fs/promises";
import deepmerge from "deepmerge";
import { glob } from "glob";
import { parse } from "jsonc-parser";

const defaultConfig = {
  compilerOptions: {
    strictNullChecks: true,
  },
};

/**
 * Find all tsconfig.json files in the project
 */
const findTsConfigFiles = async (): Promise<string[]> => {
  try {
    const files = await glob("**/tsconfig*.json", {
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
      ],
      absolute: false,
    });
    return files;
  } catch {
    return [];
  }
};

/**
 * Update a single tsconfig.json file with strictNullChecks
 */
const updateTsConfigFile = async (filePath: string): Promise<void> => {
  try {
    const existingContents = await readFile(filePath, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // If parsing fails (invalid JSON), treat as empty config and proceed gracefully
    const configToMerge = existingConfig || {};
    const newConfig = deepmerge(configToMerge, defaultConfig);

    await writeFile(filePath, JSON.stringify(newConfig, null, 2));
  } catch (error) {
    // Log error but don't fail the entire operation
    console.warn(`Failed to update ${filePath}:`, error);
  }
};

export const tsconfig = {
  /**
   * Check if any tsconfig.json files exist in the project
   */
  exists: async (): Promise<boolean> => {
    const files = await findTsConfigFiles();
    return files.length > 0;
  },
  /**
   * Find and update all tsconfig.json files in the project
   */
  update: async (): Promise<void> => {
    const files = await findTsConfigFiles();

    if (files.length === 0) {
      console.warn("No tsconfig.json files found in the project");
      return;
    }

    await Promise.all(files.map((file) => updateTsConfigFile(file)));
  },
};
