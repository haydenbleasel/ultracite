import { accessSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";

import { readPackageJson, readPackageJsonSync } from "./schemas";

export const exists = (path: string): boolean => {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
};

export const isMonorepo = (): boolean => {
  if (exists("pnpm-workspace.yaml")) {
    return true;
  }

  const pkgJson = readPackageJsonSync();
  if (!pkgJson) {
    return false;
  }

  return !!pkgJson.workspaces || !!pkgJson.workspace;
};

export const updatePackageJson = async ({
  dependencies,
  devDependencies,
  scripts,
  type,
}: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  type?: string;
}) => {
  const packageJsonObject = await readPackageJson();
  if (!packageJsonObject) {
    throw new Error("Failed to parse package.json: file is missing or invalid");
  }

  const newPackageJsonObject = {
    ...packageJsonObject,
  };

  if (type) {
    newPackageJsonObject.type = type;
  }

  // Only add devDependencies if they exist in the original package.json or are being added
  if (packageJsonObject.devDependencies || devDependencies) {
    newPackageJsonObject.devDependencies = {
      ...packageJsonObject.devDependencies,
      ...devDependencies,
    };
  }

  // Only add dependencies if they exist in the original package.json or are being added
  if (packageJsonObject.dependencies || dependencies) {
    newPackageJsonObject.dependencies = {
      ...packageJsonObject.dependencies,
      ...dependencies,
    };
  }

  // Only add scripts if they exist in the original package.json or are being added
  if (packageJsonObject.scripts || scripts) {
    newPackageJsonObject.scripts = {
      ...packageJsonObject.scripts,
      ...scripts,
    };
  }

  await writeFile(
    "package.json",
    `${JSON.stringify(newPackageJsonObject, null, 2)}\n`
  );
};

export const ensureDirectory = (path: string): void => {
  const dir = dirname(path);
  if (dir !== ".") {
    const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
    mkdirSync(cleanDir, { recursive: true });
  }
};

const SAFE_IDENTIFIER = /^[a-z][a-z0-9-]*$/;

/**
 * Validates that a framework name is safe to interpolate into generated code.
 * Throws if the name contains characters outside [a-z0-9-].
 */
export const validateFrameworkName = (name: string): string => {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(
      `Invalid framework name "${name}": must match ${SAFE_IDENTIFIER}`
    );
  }
  return name;
};

export type Linter = "biome" | "eslint" | "oxlint";

// Config file names for each linter
const biomeConfigNames = ["biome.json", "biome.jsonc"] as const;

const eslintConfigNames = [
  "eslint.config.mjs",
  "eslint.config.js",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
] as const;

const oxlintConfigNames = [".oxlintrc.json", "oxlint.config.ts"];

export const detectLinter = (startDir = process.cwd()): Linter | null => {
  let dir = startDir;

  while (true) {
    for (const name of biomeConfigNames) {
      if (exists(join(dir, name))) {
        return "biome";
      }
    }

    for (const name of eslintConfigNames) {
      if (exists(join(dir, name))) {
        return "eslint";
      }
    }

    for (const name of oxlintConfigNames) {
      if (exists(join(dir, name))) {
        return "oxlint";
      }
    }

    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
};
