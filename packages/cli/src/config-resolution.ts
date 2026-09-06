import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { parse } from "jsonc-parser";
import { exports as resolvePackageExports } from "resolve.exports";
import type { Package } from "resolve.exports";
import { z } from "zod";

import { biomeConfigNames, exists } from "./utils";
import type { Linter } from "./utils";

const PACKAGE_NAME = "ultracite";

export const BIOME_EXTENDS_SPECIFIER = "ultracite/biome/core";

// The package specifier each linter's generated config resolves at runtime.
// Ultracite has no "." export, so resolution always goes through a subpath.
const linterSpecifiers = {
  biome: BIOME_EXTENDS_SPECIFIER,
  eslint: "ultracite/eslint/core",
  oxlint: "ultracite/oxlint/core",
} satisfies Record<Linter, string>;

/**
 * The filesystem reads this module needs, injectable so tests can describe a
 * project layout without mocking node:fs globally.
 */
export interface ConfigFileSystem {
  exists: (filePath: string) => boolean;
  readFile: (filePath: string) => string;
}

const nodeFileSystem: ConfigFileSystem = {
  exists,
  readFile: (filePath) => readFileSync(filePath, "utf-8"),
};

const walkUp = <T>(
  startDir: string,
  visit: (dir: string) => T | null
): T | null => {
  let dir = startDir;

  while (true) {
    const result = visit(dir);
    if (result !== null) {
      return result;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

const findPackageDir = (
  name: string,
  startDir: string,
  fs: ConfigFileSystem
): string | null =>
  walkUp(startDir, (dir) => {
    const packageDir = path.join(dir, "node_modules", name);
    return fs.exists(path.join(packageDir, "package.json")) ? packageDir : null;
  });

const findUltracitePackage = (
  startDir: string,
  fs: ConfigFileSystem
): string | null => findPackageDir(PACKAGE_NAME, startDir, fs);

// The manifest fields the version and hand-off checks read; everything else
// in an installed package.json is irrelevant here. A string `bin` is npm's
// shorthand for a single executable named after the package, so it's
// normalised to the record form at the parse boundary.
const installedPackageManifestSchema = (name: string) =>
  z.looseObject({
    bin: z
      .union([
        z.string().transform((bin) => ({ [name]: bin })),
        z.record(z.string(), z.string()),
      ])
      .optional(),
    version: z.string().optional(),
  });

export interface InstalledPackage {
  dir: string;
  manifest: {
    bin?: Record<string, string>;
    version?: string;
  };
}

/**
 * Locate a package the way the linters do — through the nearest node_modules
 * walking up from `cwd` — and read its manifest. Returns null when it isn't
 * installed in the project or its package.json can't be parsed. Like
 * `resolveFrom`, this deliberately avoids `require.resolve`, which under Bun
 * can fall back to a global cache and report packages the project lacks.
 */
export const findInstalledPackage = (
  name: string,
  cwd = process.cwd(),
  fs: ConfigFileSystem = nodeFileSystem
): InstalledPackage | null => {
  const dir = findPackageDir(name, cwd, fs);

  if (!dir) {
    return null;
  }

  try {
    const manifest = installedPackageManifestSchema(name).safeParse(
      JSON.parse(fs.readFile(path.join(dir, "package.json")))
    );
    return manifest.success ? { dir, manifest: manifest.data } : null;
  } catch {
    return null;
  }
};

/**
 * Resolve a package specifier the way Biome/ESLint/Oxlint do: through the
 * project's node_modules and the `exports` map found there.
 *
 * Deliberately not `require.resolve` — under Bun, that falls back to the global
 * auto-install cache and resolves specifiers the project's own node_modules
 * can't, which is exactly the state we need to detect.
 */
export const resolveFrom = (
  specifier: string,
  dir: string,
  fs: ConfigFileSystem = nodeFileSystem
): string | null => {
  const packageDir = findUltracitePackage(dir, fs);

  if (!packageDir) {
    return null;
  }

  // resolve.exports's own Package type is the contract the parsed manifest is
  // read against; the library tolerates missing/malformed exports fields.
  let pkg: Package;

  try {
    pkg = JSON.parse(fs.readFile(path.join(packageDir, "package.json")));
  } catch {
    return null;
  }

  const subpath = `.${specifier.slice(PACKAGE_NAME.length)}`;

  let targets: readonly string[] | undefined;

  try {
    // Conditional exports ({ types, default }) resolve to their "default"
    // branch — the only condition a linter reading a config file off disk
    // cares about. `unsafe` keeps resolve.exports from adding the node/import
    // conditions on top of it.
    targets =
      resolvePackageExports(pkg, subpath, { unsafe: true }) ?? undefined;
  } catch {
    // resolve.exports throws when the subpath matches no export entry.
    return null;
  }

  const [target] = targets ?? [];

  if (!target) {
    return null;
  }

  const resolved = path.join(packageDir, target);
  return fs.exists(resolved) ? resolved : null;
};

export const canResolveUltracite = (
  linter: Linter,
  cwd = process.cwd(),
  fs: ConfigFileSystem = nodeFileSystem
): boolean => resolveFrom(linterSpecifiers[linter], cwd, fs) !== null;

const findBiomeConfig = (
  startDir: string,
  fs: ConfigFileSystem
): string | null =>
  walkUp(startDir, (dir) => {
    for (const name of biomeConfigNames) {
      const configPath = path.join(dir, name);
      if (fs.exists(configPath)) {
        return configPath;
      }
    }
    return null;
  });

const extendsUltracite = (
  configPath: string,
  fs: ConfigFileSystem
): boolean => {
  try {
    const config = parse(fs.readFile(configPath));

    return (
      Array.isArray(config?.extends) &&
      config.extends.includes(BIOME_EXTENDS_SPECIFIER)
    );
  } catch {
    return false;
  }
};

/**
 * Biome resolves `extends` package specifiers itself, from the config file's
 * directory, and reports an opaque "module not found" when it can't. That
 * happens whenever Ultracite isn't installed in the project — easy to miss,
 * because `npx ultracite check` / `bunx ultracite check` still run the CLI
 * from a temp cache, so the command itself works.
 *
 * Returns the config whose `extends` can't be resolved, or null when there's
 * nothing to warn about: no Biome config, a config that doesn't extend
 * Ultracite (e.g. one pointing at a relative path), or a resolvable one.
 */
export const findUnresolvableBiomeConfig = (
  cwd = process.cwd(),
  fs: ConfigFileSystem = nodeFileSystem
): string | null => {
  const configPath = findBiomeConfig(cwd, fs);

  if (!configPath || !extendsUltracite(configPath, fs)) {
    return null;
  }

  return resolveFrom(BIOME_EXTENDS_SPECIFIER, path.dirname(configPath), fs)
    ? null
    : configPath;
};

/**
 * A problem with the user's setup rather than a bug: reported as a plain
 * message, with no stack trace to wade through.
 */
export class UltraciteSetupError extends Error {
  override readonly name = "UltraciteSetupError";
}

export const buildUnresolvableBiomeConfigMessage = (
  configPath: string
): string =>
  [
    `${path.basename(configPath)} extends "${BIOME_EXTENDS_SPECIFIER}", but Ultracite could not be resolved from ${path.dirname(configPath)}.`,
    "Biome loads that config from your project's node_modules, so Ultracite has to be installed there — running the CLI through npx/bunx doesn't install it.",
    "Add it as a dev dependency (e.g. `npm install --save-dev ultracite`) and try again.",
  ].join(" ");
