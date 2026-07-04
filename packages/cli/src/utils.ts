import { accessSync, lstatSync, mkdirSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { glob } from "glob";
import YAML from "yaml";

import type { Framework } from "./data/options";
import type { PackageJson } from "./schemas";
import { readPackageJson, readPackageJsonSync } from "./schemas";

export const exists = (filePath: string): boolean => {
  try {
    accessSync(filePath);
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

const collectDeps = (pkg: PackageJson | undefined): string[] => {
  if (!pkg) {
    return [];
  }
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ];
};

const getWorkspacePatterns = async (
  rootPkg: PackageJson | undefined
): Promise<string[]> => {
  const patterns = new Set<string>();

  const ws = rootPkg?.workspaces;
  if (Array.isArray(ws)) {
    for (const pattern of ws) {
      patterns.add(pattern);
    }
  } else if (ws && typeof ws === "object") {
    const { packages } = ws as { packages?: unknown };
    if (Array.isArray(packages)) {
      for (const pattern of packages) {
        if (typeof pattern === "string") {
          patterns.add(pattern);
        }
      }
    }
  }

  if (exists("pnpm-workspace.yaml")) {
    try {
      const content = await readFile("pnpm-workspace.yaml", "utf-8");
      const parsed = YAML.parse(content) as { packages?: unknown };
      if (Array.isArray(parsed?.packages)) {
        for (const pattern of parsed.packages) {
          if (typeof pattern === "string") {
            patterns.add(pattern);
          }
        }
      }
    } catch {
      // ignore malformed pnpm-workspace.yaml
    }
  }

  return [...patterns];
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

    const patterns = await getWorkspacePatterns(rootPkg);
    if (patterns.length > 0) {
      const pkgJsonPaths = await glob(
        patterns.map(
          (pattern) => `${pattern.replace(/\/+$/u, "")}/package.json`
        ),
        { absolute: false, ignore: ["**/node_modules/**"] }
      );
      const workspacePkgs = await Promise.all(
        pkgJsonPaths.map((pkgPath) => readPackageJson(pkgPath))
      );
      for (const pkg of workspacePkgs) {
        for (const dep of collectDeps(pkg)) {
          deps.add(dep);
        }
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

export const detectLinter = (startDir = process.cwd()): Linter | null => {
  let dir = startDir;

  while (true) {
    for (const name of biomeConfigNames) {
      if (exists(path.join(dir, name))) {
        return "biome";
      }
    }

    for (const name of eslintConfigNames) {
      if (exists(path.join(dir, name))) {
        return "eslint";
      }
    }

    for (const name of oxlintConfigNames) {
      if (exists(path.join(dir, name))) {
        return "oxlint";
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
};
