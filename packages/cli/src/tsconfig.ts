import { readFile, writeFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { glob } from "glob";
import { applyEdits, modify } from "jsonc-parser";
import type { ModificationOptions } from "jsonc-parser";
import type { z } from "zod";

import { parseJsonc, tsConfigSchema } from "./schemas";

/**
 * Find all tsconfig.json files in the project
 */
const findTsConfigFiles = async (): Promise<string[]> => {
  try {
    const files = await glob("**/tsconfig*.json", {
      absolute: false,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
      ],
    });
    return files;
  } catch {
    return [];
  }
};

type TsConfig = z.infer<typeof tsConfigSchema>;

/**
 * Check if strictNullChecks is already enabled (directly or via strict: true)
 */
const hasStrictNullChecks = (config: TsConfig | undefined): boolean => {
  if (!config?.compilerOptions) {
    return false;
  }

  // strict: true enables strictNullChecks
  if (config.compilerOptions.strict === true) {
    return true;
  }

  // strictNullChecks is explicitly set
  return config.compilerOptions.strictNullChecks === true;
};

/**
 * Update a single tsconfig.json file with strictNullChecks
 * Preserves comments and only modifies if necessary
 */
const updateTsConfigFile = async (filePath: string): Promise<void> => {
  try {
    const existingContents = await readFile(filePath, "utf-8");
    const existingConfig = parseJsonc(existingContents, tsConfigSchema);

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
      await writeFile(filePath, `${JSON.stringify(freshConfig, null, 2)}\n`);
      return;
    }

    // Use jsonc-parser's modify to preserve comments
    const modifyOptions: ModificationOptions = {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2,
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
    log.warn(
      `Failed to update ${filePath}: ${error instanceof Error ? error.message : error}`
    );
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
      return;
    }

    await Promise.all(files.map((file) => updateTsConfigFile(file)));
  },
};
