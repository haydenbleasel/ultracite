import { readFile } from "node:fs/promises";
import path from "node:path";

import { log } from "@clack/prompts";
import fastGlob from "fast-glob";
import { applyEdits, modify } from "jsonc-parser";
import type { ModificationOptions } from "jsonc-parser";
import type { z } from "zod";

import { parseJsonc, tsConfigSchema } from "./schemas";
import { exists, writeProjectFile } from "./utils";

/**
 * Find all tsconfig.json files in the project
 */
const findTsConfigFiles = async (): Promise<string[]> => {
  try {
    const files = await fastGlob("**/tsconfig*.json", {
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

interface StrictFlags {
  strict?: boolean;
  strictNullChecks?: boolean;
}

const ownStrictFlags = (config: TsConfig | undefined): StrictFlags => {
  const flags: StrictFlags = {};
  const options = config?.compilerOptions;

  if (options?.strict !== undefined) {
    flags.strict = options.strict;
  }
  if (options?.strictNullChecks !== undefined) {
    flags.strictNullChecks = options.strictNullChecks;
  }

  return flags;
};

// The file an `extends` entry points at, resolved like TypeScript does: a
// relative path (with or without .json, or a directory's tsconfig.json), or
// a package in a node_modules folder at or above the config.
const extendsCandidates = (base: string): string[] => [
  base,
  `${base}.json`,
  path.join(base, "tsconfig.json"),
];

const resolveExtends = (specifier: string, fromDir: string): string | null => {
  if (specifier.startsWith(".") || path.isAbsolute(specifier)) {
    return (
      extendsCandidates(path.resolve(fromDir, specifier)).find((candidate) =>
        exists(candidate)
      ) ?? null
    );
  }

  let dir = path.resolve(fromDir);

  while (true) {
    const found = extendsCandidates(
      path.join(dir, "node_modules", specifier)
    ).find((candidate) => exists(candidate));

    if (found) {
      return found;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

const MAX_EXTENDS_DEPTH = 10;

// The strict flags a config inherits through `extends`, later entries
// overriding earlier ones as in TypeScript. Bases that can't be found or
// read contribute nothing.
const inheritedStrictFlags = async (
  config: TsConfig | undefined,
  configPath: string,
  depth = 0
): Promise<StrictFlags> => {
  const specifiers = [config?.extends ?? []].flat();

  if (depth >= MAX_EXTENDS_DEPTH || specifiers.length === 0) {
    return {};
  }

  const bases = await Promise.all(
    specifiers.map(async (specifier) => {
      const basePath = resolveExtends(specifier, path.dirname(configPath));

      if (!basePath) {
        return {};
      }

      try {
        const base = parseJsonc(
          await readFile(basePath, "utf-8"),
          tsConfigSchema
        );
        return {
          ...(await inheritedStrictFlags(base, basePath, depth + 1)),
          ...ownStrictFlags(base),
        };
      } catch {
        return {};
      }
    })
  );

  return Object.assign({}, ...bases);
};

/**
 * Update a single tsconfig.json file with strictNullChecks
 * Preserves comments and only modifies if necessary
 */
const updateTsConfigFile = async (filePath: string): Promise<void> => {
  try {
    const existingContents = await readFile(filePath, "utf-8");
    const existingConfig = parseJsonc(existingContents, tsConfigSchema);

    // A config that can't be parsed (or doesn't match the expected shape)
    // must not be replaced — that would wipe the user's compiler options.
    if (existingConfig === undefined) {
      log.warn(
        `Could not parse ${filePath}; skipping the strictNullChecks update for it.`
      );
      return;
    }

    // What TypeScript would use: the config's own flags over the ones it
    // inherits through `extends`.
    const flags = {
      ...(await inheritedStrictFlags(existingConfig, filePath)),
      ...ownStrictFlags(existingConfig),
    };

    // An explicit `strictNullChecks: false` is the project's choice.
    if (flags.strictNullChecks === false) {
      log.warn(
        `${filePath} turns strictNullChecks off, so it was left as is. Some of Ultracite's rules work best with it on.`
      );
      return;
    }

    // Skip if strictNullChecks is already enabled (directly, via strict: true,
    // or through a config it extends)
    if (flags.strictNullChecks === true || flags.strict === true) {
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
    await writeProjectFile(filePath, newContents);
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
