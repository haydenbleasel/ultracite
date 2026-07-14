import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { parse } from "jsonc-parser";

import { biomeConfigNames, exists } from "./utils";
import type { Linter } from "./utils";

const PACKAGE_NAME = "ultracite";

export const BIOME_EXTENDS_SPECIFIER = "ultracite/biome/core";

// The package specifier each linter's generated config resolves at runtime.
// Ultracite has no "." export, so resolution always goes through a subpath.
const linterSpecifiers: Record<Linter, string> = {
  biome: BIOME_EXTENDS_SPECIFIER,
  eslint: "ultracite/eslint/core",
  oxlint: "ultracite/oxlint/core",
};

type ExportsEntry = Record<string, unknown> | string;

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

const findUltracitePackage = (
  startDir: string,
  fs: ConfigFileSystem
): string | null =>
  walkUp(startDir, (dir) => {
    const packageDir = path.join(dir, "node_modules", PACKAGE_NAME);
    return fs.exists(path.join(packageDir, "package.json")) ? packageDir : null;
  });

// Conditional exports ({ types, default }) resolve to their "default" branch —
// the only condition a linter reading a config file off disk cares about.
const resolveTarget = (entry: ExportsEntry): string | null => {
  if (typeof entry === "string") {
    return entry;
  }

  const fallback = entry.default;
  return typeof fallback === "string" ? fallback : null;
};

// Matches an exports key against a subpath, supporting the single-`*` pattern
// form Ultracite uses (e.g. "./biome/*" → "./config/biome/*/biome.jsonc").
const matchExportKey = (
  key: string,
  entry: ExportsEntry,
  subpath: string
): string | null => {
  const target = resolveTarget(entry);

  if (!target) {
    return null;
  }

  if (!key.includes("*")) {
    return key === subpath ? target : null;
  }

  const [prefix, suffix] = key.split("*");

  if (
    !subpath.startsWith(prefix) ||
    !subpath.endsWith(suffix) ||
    subpath.length < prefix.length + suffix.length
  ) {
    return null;
  }

  const wildcard = subpath.slice(prefix.length, subpath.length - suffix.length);

  // Node substitutes every `*` in the target, not just the first
  // (PACKAGE_TARGET_RESOLVE), so a two-wildcard target must expand the same way
  // here or we'd resolve a path the linter never looks at.
  return target.replaceAll("*", wildcard);
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

  let exportsField: Record<string, ExportsEntry>;

  try {
    const pkg = JSON.parse(fs.readFile(path.join(packageDir, "package.json")));
    exportsField = pkg?.exports ?? {};
  } catch {
    return null;
  }

  const subpath = `.${specifier.slice(PACKAGE_NAME.length)}`;

  for (const [key, entry] of Object.entries(exportsField)) {
    const target = matchExportKey(key, entry, subpath);

    if (target) {
      const resolved = path.join(packageDir, target);
      return fs.exists(resolved) ? resolved : null;
    }
  }

  return null;
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
