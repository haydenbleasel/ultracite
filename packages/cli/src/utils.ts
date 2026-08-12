import { accessSync, lstatSync, mkdirSync, realpathSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { any as findUpAny } from "empathic/find";
import { findWorkspaces } from "find-workspaces";

import type { Framework } from "./data/options";
import { readPackageJson, readPackageJsonSync } from "./schemas";

const pnpmWorkspaceFile = "pnpm-workspace.yaml";

export const exists = (filePath: string): boolean => {
  try {
    accessSync(filePath);
    return true;
  } catch {
    return false;
  }
};

export const isMonorepo = (): boolean => {
  if (exists(pnpmWorkspaceFile)) {
    return true;
  }

  const pkgJson = readPackageJsonSync();
  if (!pkgJson) {
    return false;
  }

  return !!pkgJson.workspaces || !!pkgJson.workspace;
};

export const ensureDirectory = (filePath: string): void => {
  const dir = path.dirname(filePath);
  if (dir !== ".") {
    const cleanDir = dir.startsWith("./") ? dir.slice(2) : dir;
    mkdirSync(cleanDir, { recursive: true });
  }
};

const isInsidePath = (target: string, root: string): boolean => {
  const relativePath = path.relative(root, target);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
};

const getRealPath = (filePath: string): string =>
  typeof realpathSync === "function"
    ? realpathSync(filePath)
    : path.resolve(filePath);

// Resolve the real path of the nearest existing ancestor so the escape check
// works for directories that haven't been created yet — segments that don't
// exist can't be symlinks, so checking the existing ancestor is sufficient.
const getRealPathOfNearestExistingAncestor = (target: string): string => {
  let current = target;

  while (true) {
    try {
      return getRealPath(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        return path.resolve(current);
      }
      current = parent;
    }
  }
};

export const assertWritableProjectPath = (filePath: string): void => {
  const projectRoot = getRealPath(process.cwd());
  const targetPath = path.resolve(process.cwd(), filePath);

  if (!isInsidePath(targetPath, projectRoot)) {
    throw new Error(`Refusing to write outside project: ${filePath}`);
  }

  const parentPath = path.dirname(targetPath);
  const realParentPath = getRealPathOfNearestExistingAncestor(parentPath);

  if (!isInsidePath(realParentPath, projectRoot)) {
    throw new Error(
      `Refusing to write through directory outside project: ${filePath}`
    );
  }

  try {
    const targetStats =
      typeof lstatSync === "function" ? lstatSync(targetPath) : undefined;

    if (targetStats?.isSymbolicLink()) {
      throw new Error(`Refusing to write through symbolic link: ${filePath}`);
    }

    const realTargetPath = getRealPath(targetPath);
    if (!isInsidePath(realTargetPath, projectRoot)) {
      throw new Error(`Refusing to write outside project: ${filePath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }
};

export const writeProjectFile = async (
  filePath: string,
  content: string
): Promise<void> => {
  // Validate before creating directories so the guard can't be used to
  // mkdir outside the project
  assertWritableProjectPath(filePath);
  ensureDirectory(filePath);
  await writeFile(filePath, content);
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

  await writeProjectFile(
    "package.json",
    `${JSON.stringify(newPackageJsonObject, null, 2)}\n`
  );
};

/**
 * The config writers generate ESM modules. Writing one into a JSON/YAML/TOML
 * rc file or a CommonJS module corrupts the config, so updates must check the
 * target can actually hold ESM before overwriting it in place.
 */
export const canHoldEsmConfig = (filePath: string): boolean => {
  if (filePath.endsWith(".mjs") || filePath.endsWith(".mts")) {
    return true;
  }

  if (filePath.endsWith(".js") || filePath.endsWith(".ts")) {
    return readPackageJsonSync()?.type === "module";
  }

  return false;
};

const SAFE_IDENTIFIER = /^[a-z][a-z0-9-]*$/u;

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

// Canonical config file-name lists for each tool. These are the single source
// of truth shared by the linter writers, the init migration step, and doctor.ts
// so the lists can't drift apart. Ordering matters: the writers return the first
// existing match, so entries are listed in resolution precedence.
export const biomeConfigNames = [
  "biome.json",
  "biome.jsonc",
  ".biome.json",
  ".biome.jsonc",
] as const;

// ESLint flat config file locations.
// https://eslint.org/docs/latest/use/configure/configuration-files
export const eslintConfigNames = [
  "eslint.config.mjs",
  "eslint.config.js",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
] as const;

// Legacy (pre-flat) ESLint config file locations, migrated away from on init.
export const legacyEslintConfigNames = [
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.yaml",
  ".eslintrc.yml",
] as const;

// Prettier config file locations.
// https://prettier.io/docs/en/configuration.html
export const prettierConfigNames = [
  // JS/TS configs (ESM)
  ".prettierrc.mjs",
  "prettier.config.mjs",
  ".prettierrc.mts",
  "prettier.config.mts",
  // JS/TS configs (CJS)
  ".prettierrc.cjs",
  "prettier.config.cjs",
  ".prettierrc.cts",
  "prettier.config.cts",
  // JS/TS configs (depends on package.json type)
  ".prettierrc.js",
  "prettier.config.js",
  ".prettierrc.ts",
  "prettier.config.ts",
  // JSON/YAML configs
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.json5",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  // TOML config
  ".prettierrc.toml",
] as const;

// Stylelint config file locations.
// https://stylelint.io/user-guide/configure
export const stylelintConfigNames = [
  // JS configs (ESM)
  ".stylelintrc.mjs",
  "stylelint.config.mjs",
  // JS configs (CJS)
  ".stylelintrc.cjs",
  "stylelint.config.cjs",
  // JS configs (depends on package.json type)
  ".stylelintrc.js",
  "stylelint.config.js",
  // JSON/YAML configs
  ".stylelintrc",
  ".stylelintrc.json",
  ".stylelintrc.yml",
  ".stylelintrc.yaml",
] as const;

export const oxlintConfigNames = [
  ".oxlintrc.json",
  "oxlint.config.ts",
] as const;
export const oxfmtConfigNames = ["oxfmt.config.ts"] as const;

// Map dep package names → framework IDs to enable. Multiple IDs cover
// meta-frameworks (e.g. Next.js implies React).
const FRAMEWORK_DEPENDENCIES: Record<string, readonly Framework[]> = {
  "@angular/core": ["angular"],
  "@builder.io/qwik": ["qwik"],
  "@nestjs/core": ["nestjs"],
  "@qwik.dev/core": ["qwik"],
  "@remix-run/node": ["remix"],
  "@remix-run/react": ["react", "remix"],
  "@tanstack/react-query": ["react", "tanstack"],
  "@tanstack/react-router": ["react", "tanstack"],
  "@tanstack/react-start": ["react", "tanstack"],
  astro: ["astro"],
  jest: ["jest"],
  next: ["react", "next"],
  nuxt: ["vue"],
  react: ["react"],
  "react-router": ["react", "remix"],
  "solid-js": ["solid"],
  svelte: ["svelte"],
  vitest: ["vitest"],
  vue: ["vue"],
};

interface DependencyFields {
  dependencies?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
  peerDependencies?: Record<string, string | undefined>;
}

const collectDeps = (pkg: DependencyFields | undefined): string[] => {
  if (!pkg) {
    return [];
  }
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ];
};

/**
 * Scan the project's package.json (and workspace package.jsons in monorepos)
 * for known framework dependencies. Returns the framework IDs to pre-select
 * in the init prompt. Best-effort — returns whatever it can find on error.
 */
export const detectFrameworks = async (): Promise<Framework[]> => {
  const detected = new Set<Framework>();

  try {
    const rootPkg = await readPackageJson();
    const deps = new Set(collectDeps(rootPkg));

    // find-workspaces resolves npm/yarn/pnpm/lerna workspace declarations
    // (including negated globs) to the member packages of a monorepo.
    for (const workspace of findWorkspaces() ?? []) {
      for (const dep of collectDeps(workspace.package)) {
        deps.add(dep);
      }
    }

    for (const dep of deps) {
      const frameworks = FRAMEWORK_DEPENDENCIES[dep];
      if (frameworks) {
        for (const framework of frameworks) {
          detected.add(framework);
        }
      }
    }
  } catch {
    // best-effort — fall through with whatever we collected
  }

  return [...detected];
};

/**
 * Walk up from startDir looking for the first existing file from fileNames,
 * mirroring how the linters themselves (and detectLinter) resolve configs —
 * so doctor's checks agree with what check/fix actually use in monorepos.
 */
export const findNearestFile = (
  fileNames: readonly string[],
  startDir = process.cwd()
): { dir: string; fileName: string; path: string } | null => {
  // empathic checks the names in order within each directory before moving to
  // the parent, matching how the linters themselves resolve configs.
  const found = findUpAny([...fileNames], { cwd: startDir });

  if (!found) {
    return null;
  }

  return {
    dir: path.dirname(found),
    fileName: path.basename(found),
    path: found,
  };
};

export const detectLinter = (startDir = process.cwd()): Linter | null => {
  // Precedence is per-directory: the nearest directory wins, and within a
  // directory Biome beats ESLint beats Oxlint — the concatenated name list
  // preserves that order at every level of the walk.
  const found = findNearestFile(
    [...biomeConfigNames, ...eslintConfigNames, ...oxlintConfigNames],
    startDir
  );

  if (!found) {
    return null;
  }

  if ((biomeConfigNames as readonly string[]).includes(found.fileName)) {
    return "biome";
  }

  if ((eslintConfigNames as readonly string[]).includes(found.fileName)) {
    return "eslint";
  }

  return "oxlint";
};
