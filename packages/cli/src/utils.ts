import { accessSync, lstatSync, mkdirSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { any as findUpAny } from "empathic/find";
import { findWorkspaces } from "find-workspaces";
import { z } from "zod";

import type { Framework } from "./data/options";
import type { JsonObject, JsonValue } from "./data/types";
import {
  detectJsonFormatting,
  packageJsonSchema,
  parseJsoncStrict,
  readPackageJson,
  readPackageJsonSync,
} from "./schemas";

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
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- the test suites mock node:fs partially; when a mock omits realpathSync the guard falls back to path.resolve
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
      // SAFETY: errors thrown by fs realpath calls carry the ErrnoException
      // `code` field; on any other Error the read yields undefined, which
      // safely rethrows below.
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
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- the test suites mock node:fs partially; when a mock omits lstatSync the symlink check is skipped
      typeof lstatSync === "function" ? lstatSync(targetPath) : undefined;

    if (targetStats?.isSymbolicLink()) {
      throw new Error(`Refusing to write through symbolic link: ${filePath}`);
    }

    const realTargetPath = getRealPath(targetPath);
    if (!isInsidePath(realTargetPath, projectRoot)) {
      throw new Error(`Refusing to write outside project: ${filePath}`);
    }
  } catch (error) {
    // SAFETY: errors thrown by fs lstat/realpath calls carry the
    // ErrnoException `code` field; on any other Error the read yields
    // undefined, which safely rethrows below.
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

const packageJsonPath = "package.json";

const jsonObjectSchema = z.record(z.string(), z.json());

export const isJsonObject = (
  value: JsonValue | undefined
): value is JsonObject =>
  value !== undefined &&
  value !== null &&
  !Array.isArray(value) &&
  jsonObjectSchema.safeParse(value).success;

/**
 * Read package.json, let `edit` change it in place, and write it back with the
 * file's own indentation and line endings. The raw document is edited rather
 * than a schema-parsed copy so every key keeps its position; new keys are
 * appended. Returning false from `edit` skips the write.
 */
export const editPackageJson = async (
  edit: (packageJson: JsonObject) => boolean | undefined
): Promise<boolean> => {
  let content: string | undefined;

  try {
    content = await readFile(packageJsonPath, "utf-8");
  } catch {
    content = undefined;
  }

  const packageJson =
    content === undefined
      ? undefined
      : parseJsoncStrict(content, jsonObjectSchema);

  if (
    content === undefined ||
    !packageJson ||
    !packageJsonSchema.safeParse(packageJson).success
  ) {
    throw new Error("Failed to parse package.json: file is missing or invalid");
  }

  if (edit(packageJson) === false) {
    return false;
  }

  const { eol = "\n", insertSpaces, tabSize } = detectJsonFormatting(content);
  const indent = insertSpaces ? tabSize : "\t";
  const serialized = JSON.stringify(packageJson, null, indent).replaceAll(
    "\n",
    eol
  );

  await writeProjectFile(packageJsonPath, `${serialized}${eol}`);
  return true;
};

const mergeInto = (
  packageJson: JsonObject,
  key: string,
  values: Record<string, string>
): void => {
  const existing = packageJson[key];
  const merged: JsonObject = {};

  if (isJsonObject(existing)) {
    Object.assign(merged, existing);
  }

  packageJson[key] = Object.assign(merged, values);
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
  await editPackageJson((packageJson) => {
    if (type) {
      packageJson.type = type;
    }

    if (devDependencies) {
      mergeInto(packageJson, "devDependencies", devDependencies);
    }

    if (dependencies) {
      mergeInto(packageJson, "dependencies", dependencies);
    }

    if (scripts) {
      mergeInto(packageJson, "scripts", scripts);
    }

    return true;
  });
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

// ESLint flat config file locations, in the order ESLint looks for them
// (FLAT_CONFIG_FILENAMES in eslint/lib/config/config-loader.js).
// https://eslint.org/docs/latest/use/configure/configuration-files
export const eslintConfigNames = [
  "eslint.config.js",
  "eslint.config.mjs",
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

// Prettier config file locations, in the order Prettier searches a
// directory (after the "prettier" key in package.json).
// https://prettier.io/docs/configuration
export const prettierConfigNames = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.json5",
  ".prettierrc.js",
  "prettier.config.js",
  ".prettierrc.ts",
  "prettier.config.ts",
  ".prettierrc.mjs",
  "prettier.config.mjs",
  ".prettierrc.mts",
  "prettier.config.mts",
  ".prettierrc.cjs",
  "prettier.config.cjs",
  ".prettierrc.cts",
  "prettier.config.cts",
  ".prettierrc.toml",
] as const;

// Stylelint config file locations, in the order Stylelint (through
// cosmiconfig) searches a directory, after the "stylelint" key in
// package.json.
// https://stylelint.io/user-guide/configure
export const stylelintConfigNames = [
  ".stylelintrc",
  ".stylelintrc.json",
  ".stylelintrc.yaml",
  ".stylelintrc.yml",
  ".stylelintrc.js",
  ".stylelintrc.ts",
  ".stylelintrc.cjs",
  ".stylelintrc.mjs",
  "stylelint.config.js",
  "stylelint.config.ts",
  "stylelint.config.cjs",
  "stylelint.config.mjs",
] as const;

// Oxlint and oxfmt each load exactly one config per directory and refuse to
// run when two of these sit side by side. Ultracite writes the .ts form in an
// ES module package and the .mts form otherwise (see resolveEsmConfigPath);
// the JSON forms are what `oxlint --init` / `oxfmt --init` create.
export const oxlintConfigNames = [
  ".oxlintrc.json",
  "oxlint.config.ts",
  "oxlint.config.mts",
] as const;
export const oxfmtConfigNames = [
  "oxfmt.config.ts",
  "oxfmt.config.mts",
  ".oxfmtrc.json",
  ".oxfmtrc.jsonc",
] as const;

export interface EsmConfigPaths {
  // Both forms exist, which the tools refuse to load; nothing can be written.
  conflict: boolean;
  existing: string | null;
  target: string;
}

/**
 * Which of a TS config's two names (`name.ts` / `name.mts`) to read and
 * write. Node loads ES module syntax from a .ts file only when package.json
 * says "type": "module": without a "type" it prints a
 * MODULE_TYPELESS_PACKAGE_JSON warning on every run, and with "commonjs" it
 * can't load it at all. A .mts file is always an ES module, so a new config
 * gets .ts in an ES module package and .mts otherwise. An existing config
 * keeps its name, except a .ts config in a "commonjs" package, which can't
 * load and moves to .mts. init never changes "type" itself: that would
 * change how every .js file in the package is loaded.
 */
export const resolveEsmConfigPath = (
  tsPath: string,
  mtsPath: string
): EsmConfigPaths => {
  const hasTs = exists(tsPath);
  const hasMts = exists(mtsPath);
  const type = readPackageJsonSync()?.type;

  if (hasTs && hasMts) {
    return { conflict: true, existing: null, target: tsPath };
  }

  if (hasMts) {
    return { conflict: false, existing: mtsPath, target: mtsPath };
  }

  if (hasTs) {
    return {
      conflict: false,
      existing: tsPath,
      target: type === "commonjs" ? mtsPath : tsPath,
    };
  }

  return {
    conflict: false,
    existing: null,
    target: type === "module" ? tsPath : mtsPath,
  };
};

// Map dep package names → framework IDs to enable. Multiple IDs cover
// meta-frameworks (e.g. Next.js implies React).
const FRAMEWORK_DEPENDENCIES = new Map<string, readonly Framework[]>([
  ["@angular/core", ["angular"]],
  ["@builder.io/qwik", ["qwik"]],
  ["@nestjs/core", ["nestjs"]],
  ["@qwik.dev/core", ["qwik"]],
  ["@remix-run/node", ["remix"]],
  ["@remix-run/react", ["react", "remix"]],
  ["@tanstack/react-query", ["react", "tanstack"]],
  ["@tanstack/react-router", ["react", "tanstack"]],
  ["@tanstack/react-start", ["react", "tanstack"]],
  ["astro", ["astro"]],
  ["jest", ["jest"]],
  ["next", ["react", "next"]],
  ["nuxt", ["vue"]],
  ["react", ["react"]],
  ["react-router", ["react", "remix"]],
  ["solid-js", ["solid"]],
  ["svelte", ["svelte"]],
  ["vitest", ["vitest"]],
  ["vue", ["vue"]],
]);

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
      const frameworks = FRAMEWORK_DEPENDENCIES.get(dep);
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

  if (biomeConfigNames.some((name) => name === found.fileName)) {
    return "biome";
  }

  if (eslintConfigNames.some((name) => name === found.fileName)) {
    return "eslint";
  }

  return "oxlint";
};
