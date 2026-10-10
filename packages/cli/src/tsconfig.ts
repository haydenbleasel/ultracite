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

export interface TsConfigUpdate {
  contents: string;
  filePath: string;
}

/**
 * The strictNullChecks edit for one tsconfig, or null when it needs none.
 * Comments are preserved, and only a config that doesn't get the flag from
 * itself or a config it extends is changed.
 */
const planTsConfigUpdate = async (
  filePath: string
): Promise<TsConfigUpdate | null> => {
  try {
    const existingContents = await readFile(filePath, "utf-8");
    const existingConfig = parseJsonc(existingContents, tsConfigSchema);

    // A config that can't be parsed (or doesn't match the expected shape)
    // must not be replaced — that would wipe the user's compiler options.
    if (existingConfig === undefined) {
      log.warn(
        `Could not parse ${filePath}; skipping the strictNullChecks update for it.`
      );
      return null;
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
        `${filePath} turns strictNullChecks off, so it was left as is. Some of Ultracite's type-aware rules need it on.`
      );
      return null;
    }

    // Skip if strictNullChecks is already enabled (directly, via strict: true,
    // or through a config it extends)
    if (flags.strictNullChecks === true || flags.strict === true) {
      return null;
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

    return { contents: applyEdits(existingContents, edits), filePath };
  } catch (error) {
    // Log error but don't fail the entire operation
    log.warn(
      `Failed to update ${filePath}: ${error instanceof Error ? error.message : error}`
    );
    return null;
  }
};

const applyTsConfigUpdate = async ({
  contents,
  filePath,
}: TsConfigUpdate): Promise<void> => {
  try {
    await writeProjectFile(filePath, contents);
  } catch (error) {
    log.warn(
      `Failed to update ${filePath}: ${error instanceof Error ? error.message : error}`
    );
  }
};

export const tsconfig = {
  /** Apply updates from `plan`. */
  apply: async (updates: readonly TsConfigUpdate[]): Promise<void> => {
    await Promise.all(updates.map((update) => applyTsConfigUpdate(update)));
  },
  /**
   * Check if any tsconfig.json files exist in the project
   */
  exists: async (): Promise<boolean> => {
    const files = await findTsConfigFiles();
    return files.length > 0;
  },
  /**
   * The tsconfig.json files that would get strictNullChecks, with their new
   * contents, without writing anything.
   */
  plan: async (): Promise<TsConfigUpdate[]> => {
    const files = await findTsConfigFiles();
    const updates = await Promise.all(
      files.map((file) => planTsConfigUpdate(file))
    );
    return updates.filter((update) => update !== null);
  },
  /**
   * Find and update all tsconfig.json files in the project
   */
  update: async (): Promise<void> => {
    await tsconfig.apply(await tsconfig.plan());
  },
};
