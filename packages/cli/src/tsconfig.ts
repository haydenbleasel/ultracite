import { readFile, writeFile } from "node:fs/promises";
import { glob } from "glob";
import {
  applyEdits,
  type ModificationOptions,
  modify,
  parse,
} from "jsonc-parser";

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
 * Check if strictNullChecks is already enabled (directly or via strict: true)
 */
const hasStrictNullChecks = (
  config: Record<string, unknown> | undefined
): boolean => {
  if (!config) {
    return false;
  }

  const compilerOptions = config.compilerOptions as
    | Record<string, unknown>
    | undefined;

  if (!compilerOptions) {
    return false;
  }

  // strict: true enables strictNullChecks
  if (compilerOptions.strict === true) {
    return true;
  }

  // strictNullChecks is explicitly set
  if (compilerOptions.strictNullChecks === true) {
    return true;
  }

  return false;
};

/**
 * Update a single tsconfig.json file with strictNullChecks
 * Preserves comments and only modifies if necessary
 */
const updateTsConfigFile = async (filePath: string): Promise<void> => {
  try {
    const existingContents = await readFile(filePath, "utf-8");
    const existingConfig = parse(existingContents) as
      | Record<string, unknown>
      | undefined;

    // Skip if strictNullChecks is already enabled (directly or via strict: true)
    if (hasStrictNullChecks(existingConfig)) {
      return;
    }

    // If the file contains invalid JSON, write a fresh config
    if (existingConfig === undefined) {
      const freshConfig = {
        compilerOptions: {
          strictNullChecks: true,
        },
      };
      await writeFile(filePath, JSON.stringify(freshConfig, null, 2));
      return;
    }

    // Use jsonc-parser's modify to preserve comments
    const modifyOptions: ModificationOptions = {
      formattingOptions: {
        tabSize: 2,
        insertSpaces: true,
      },
    };

    const edits = modify(
      existingContents,
      ["compilerOptions", "strictNullChecks"],
      true,
      modifyOptions
    );

    const newContents = applyEdits(existingContents, edits);
    await writeFile(filePath, newContents);
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
