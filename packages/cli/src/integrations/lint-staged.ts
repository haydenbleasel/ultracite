import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { log } from "@clack/prompts";
import { parse } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";
import { generateCode, parseModule } from "magicast";
import { addDevDependency } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";
import YAML from "yaml";

import type { JsonObject, JsonValue } from "../data/types";
import { getRootInstallOptions } from "../package-manager";
import { parsePackageJson } from "../schemas";
import { exists, writeProjectFile } from "../utils";
import {
  isGeneratedUltraciteFixCommand,
  ultraciteFixCommand,
} from "./project-command";
import { renderYamlDocument, replaceYamlStrings } from "./yaml-document";

const packageJsonPath = "./package.json";
const packageYamlPaths = ["./package.yaml", "./package.yml"];
const LINT_STAGED_KEY = "lint-staged";

const ULTRACITE_PATTERN = "*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}";

const createLintStagedConfig = (packageManager: PackageManagerName) => ({
  [ULTRACITE_PATTERN]: [ultraciteFixCommand(packageManager)],
});

// Every dedicated config file lint-staged reads, in the order it picks
// between them. lint-staged 16 loads every config in a directory, sorts them
// with localeCompare, and hands all of that directory's files to the first
// one, so a config we create next to an existing one would silently disable
// it. A dedicated file also beats a package.json "lint-staged" key.
const configFiles = [
  "./.lintstagedrc",
  "./.lintstagedrc.cjs",
  "./.lintstagedrc.cts",
  "./.lintstagedrc.js",
  "./.lintstagedrc.json",
  "./.lintstagedrc.mjs",
  "./.lintstagedrc.mts",
  "./.lintstagedrc.ts",
  "./.lintstagedrc.yaml",
  "./.lintstagedrc.yml",
  "./lint-staged.config.cjs",
  "./lint-staged.config.cts",
  "./lint-staged.config.js",
  "./lint-staged.config.mjs",
  "./lint-staged.config.mts",
  "./lint-staged.config.ts",
];

// A value loaded from a user's JS config module: JSON data, or a function
// (lint-staged builds commands from the staged file list with those).
type LintStagedFunction = (
  files: string[]
) => string | string[] | Promise<string | string[]>;
type ModuleValue =
  | JsonValue
  | LintStagedFunction
  | ModuleValue[]
  | { [key: string]: ModuleValue };

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- decoding a user's lint-staged config, which may be any JSON/YAML value
  typeof value === "object" && value !== null && !Array.isArray(value);

const mentionsUltracite = (config: JsonValue): boolean =>
  JSON.stringify(config).includes("ultracite");

/**
 * The JSON data in a value loaded from a JS config, or undefined when a
 * function is anywhere in it. Function-valued entries are a documented
 * lint-staged pattern, but they can't survive a JSON round-trip — rewriting
 * such a config would silently delete the user's functions.
 */
const toJsonValue = (value: ModuleValue): JsonValue | undefined => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- walking a config loaded from the user's JS module, where function-valued entries are exactly what's being detected
  if (typeof value === "function") {
    return undefined;
  }

  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (const item of value) {
      const json = toJsonValue(item);
      if (json === undefined) {
        return undefined;
      }
      items.push(json);
    }
    return items;
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- same untyped-module boundary: distinguishes nested config objects from scalars
  if (value !== null && typeof value === "object") {
    const entries: [string, JsonValue][] = [];
    for (const [key, entry] of Object.entries(value)) {
      const json = toJsonValue(entry);
      if (json === undefined) {
        return undefined;
      }
      entries.push([key, json]);
    }
    return Object.fromEntries(entries);
  }

  return value;
};

const warnUnmergeableConfig = (
  filename: string,
  packageManager: PackageManagerName
): void => {
  log.warn(
    `Could not add Ultracite to ${filename} automatically. Add "${ultraciteFixCommand(packageManager)}" for "${ULTRACITE_PATTERN}" to it manually.`
  );
};

// An earlier init may have written a dlx command (`yarn dlx ultracite fix`
// fails on Yarn 1; `pnpm dlx` ignores the pinned version). Swap those for the
// current command, leaving hand-written commands alone.
const upgradeCommand = (value: JsonValue, command: string): JsonValue => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- walking a user's lint-staged config, whose task values are strings or arrays of strings
  if (typeof value === "string") {
    return isGeneratedUltraciteFixCommand(value) ? command : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => upgradeCommand(entry, command));
  }
  return value;
};

/**
 * `config` with the ultracite task added under its glob: appended to an
 * existing command list, or turned into a list alongside an existing single
 * command. A config that already runs ultracite only has generated commands
 * upgraded. Returns null when the glob holds something we can't extend and so
 * needs a manual edit.
 */
const mergeUltraciteTask = (
  config: JsonObject,
  command: string
): JsonObject | null => {
  if (mentionsUltracite(config)) {
    return Object.fromEntries(
      Object.entries(config).map(([pattern, task]) => [
        pattern,
        upgradeCommand(task, command),
      ])
    );
  }

  const existing = config[ULTRACITE_PATTERN];

  if (existing === undefined) {
    return { ...config, [ULTRACITE_PATTERN]: [command] };
  }

  if (Array.isArray(existing)) {
    return { ...config, [ULTRACITE_PATTERN]: [...existing, command] };
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a lint-staged task is a string or an array of strings
  if (typeof existing === "string") {
    return { ...config, [ULTRACITE_PATTERN]: [existing, command] };
  }

  return null;
};

const readJsonObject = (content: string): JsonObject | null => {
  const errors: ParseError[] = [];
  // jsonc-parser's output is untyped; a JSON document parses to a JSON value,
  // and only a clean parse to an object counts.
  const parsed: JsonValue | undefined = parse(content, errors, {
    allowTrailingComma: true,
  });
  return errors.length === 0 && isJsonObject(parsed) ? parsed : null;
};

const hasPackageJsonLintStaged = async (): Promise<boolean> => {
  try {
    const content = await readFile(packageJsonPath, "utf-8");
    const packageJson = parsePackageJson(content);
    return Boolean(packageJson?.[LINT_STAGED_KEY]);
  } catch {
    return false;
  }
};

const hasYamlLintStagedKey = async (file: string): Promise<boolean> => {
  try {
    // YAML.parse is untyped; a YAML document parses to a JSON value.
    const parsed: JsonValue = YAML.parse(await readFile(file, "utf-8"));
    return isJsonObject(parsed) && Boolean(parsed[LINT_STAGED_KEY]);
  } catch {
    // An unparseable package.yaml holds no lint-staged config we can use.
    return false;
  }
};

const findPackageYamlWithLintStaged = async (): Promise<string | undefined> => {
  const candidates = packageYamlPaths.filter((file) => exists(file));
  const hasKey = await Promise.all(candidates.map(hasYamlLintStagedKey));
  return candidates.find((_file, index) => hasKey[index]);
};

// Check if project uses ESM
const isProjectEsm = async (): Promise<boolean> => {
  try {
    const content = await readFile(packageJsonPath, "utf-8");
    const packageJson = parsePackageJson(content);
    return packageJson?.type === "module";
  } catch {
    return false;
  }
};

const writeJson = async (filename: string, value: JsonValue): Promise<void> => {
  await writeProjectFile(filename, `${JSON.stringify(value, null, 2)}\n`);
};

// Update package.json lint-staged config
const updatePackageJson = async (
  packageManager: PackageManagerName
): Promise<void> => {
  const packageJson = readJsonObject(await readFile(packageJsonPath, "utf-8"));
  const existingConfig = packageJson?.[LINT_STAGED_KEY];

  if (!(packageJson && isJsonObject(existingConfig))) {
    return;
  }

  const merged = mergeUltraciteTask(
    existingConfig,
    ultraciteFixCommand(packageManager)
  );

  if (!merged) {
    warnUnmergeableConfig(packageJsonPath, packageManager);
    return;
  }

  if (JSON.stringify(merged) !== JSON.stringify(existingConfig)) {
    await writeJson(packageJsonPath, {
      ...packageJson,
      [LINT_STAGED_KEY]: merged,
    });
  }
};

// Update JSON config files
const updateJsonConfig = async (
  filename: string,
  content: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const existingConfig = readJsonObject(content);

  if (!existingConfig) {
    warnUnmergeableConfig(filename, packageManager);
    return;
  }

  const merged = mergeUltraciteTask(
    existingConfig,
    ultraciteFixCommand(packageManager)
  );

  if (!merged) {
    warnUnmergeableConfig(filename, packageManager);
    return;
  }

  if (JSON.stringify(merged) !== JSON.stringify(existingConfig)) {
    await writeJson(filename, merged);
  }
};

// Quote unquoted glob pattern keys that YAML would misinterpret as aliases or tags
const quoteGlobKeys = (content: string): string =>
  content.replaceAll(
    /^(?<key>[*?{[][^\n:]*):(?<rest>.*)$/gmu,
    (_match, key: string, rest: string) => `'${key}':${rest}`
  );

/**
 * Adds the ultracite task to a YAML lint-staged config in place, through the
 * yaml Document API so comments and formatting elsewhere in the file survive.
 * Returns whether the document changed, or null when it can't be merged.
 */
const addUltraciteTaskToYaml = (
  doc: YAML.Document,
  config: YAML.YAMLMap,
  command: string
): boolean | null => {
  if (mentionsUltracite(config.toJSON())) {
    return replaceYamlStrings(config, isGeneratedUltraciteFixCommand, command);
  }

  const existing = config.get(ULTRACITE_PATTERN, true);

  if (existing === undefined) {
    config.set(doc.createNode(ULTRACITE_PATTERN), doc.createNode([command]));
    return true;
  }

  if (YAML.isSeq(existing)) {
    existing.add(doc.createNode(command));
    return true;
  }

  if (YAML.isScalar(existing)) {
    config.set(
      doc.createNode(ULTRACITE_PATTERN),
      doc.createNode([existing.value, command])
    );
    return true;
  }

  return null;
};

// Update YAML config files (and the "lint-staged" key of package.yaml)
const updateYamlConfig = async (
  filename: string,
  content: string,
  packageManager: PackageManagerName,
  key?: string
): Promise<void> => {
  const doc = YAML.parseDocument(quoteGlobKeys(content));
  const root = key ? doc.get(key, true) : doc.contents;

  // An unparseable file, or one that isn't a mapping of globs to tasks, is
  // left exactly as it is — rewriting it would destroy the user's config.
  if (doc.errors.length > 0 || !YAML.isMap(root)) {
    warnUnmergeableConfig(filename, packageManager);
    return;
  }

  const changed = addUltraciteTaskToYaml(
    doc,
    root,
    ultraciteFixCommand(packageManager)
  );

  if (changed === null) {
    warnUnmergeableConfig(filename, packageManager);
    return;
  }

  if (changed) {
    await writeProjectFile(filename, renderYamlDocument(doc, content));
  }
};

// Replace generated dlx commands that appear as whole string literals.
const upgradeCommandLiterals = (content: string, command: string): string =>
  content.replaceAll(
    /(?<quote>["'`])(?<value>[^"'`\n]*ultracite fix)\k<quote>/gu,
    (match, quote: string, value: string) =>
      value !== command && isGeneratedUltraciteFixCommand(value)
        ? `${quote}${command}${quote}`
        : match
  );

// Update ESM (and TypeScript) config files. magicast edits the module's AST
// in place, so comments and function-valued entries elsewhere in the config
// survive the update — the previous import()-and-serialize approach
// destroyed both.
const updateEsmConfig = async (
  filename: string,
  content: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const command = ultraciteFixCommand(packageManager);

  if (content.includes("ultracite")) {
    const upgraded = upgradeCommandLiterals(content, command);
    if (upgraded !== content) {
      await writeProjectFile(filename, upgraded);
    }
    return;
  }

  try {
    const mod = parseModule(content);
    const config = mod.exports.default;

    if (config === undefined) {
      // No default export to merge into — add one with just our entry.
      mod.exports.default = { [ULTRACITE_PATTERN]: [command] };
    } else if (config.$type === "object") {
      const existing = config[ULTRACITE_PATTERN];

      if (existing === undefined) {
        config[ULTRACITE_PATTERN] = [command];
      } else if (Array.isArray(existing)) {
        existing.push(command);
      } else if (
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- magicast returns string literals as plain strings
        typeof existing === "string"
      ) {
        config[ULTRACITE_PATTERN] = [existing, command];
      } else {
        // A function or other value owns our pattern; replacing it would
        // delete the user's config.
        warnUnmergeableConfig(filename, packageManager);
        return;
      }
    } else {
      // e.g. `export default defineConfig(...)` or a function config.
      warnUnmergeableConfig(filename, packageManager);
      return;
    }

    const { code } = generateCode(mod);
    await writeProjectFile(filename, code.endsWith("\n") ? code : `${code}\n`);
  } catch {
    // Unparseable, or a node kind magicast can't proxy (some template
    // literals, etc.). Never fall back to a second config file: lint-staged
    // would use only one of them.
    warnUnmergeableConfig(filename, packageManager);
  }
};

// Update CommonJS config files
const updateCjsConfig = async (
  filename: string,
  content: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const command = ultraciteFixCommand(packageManager);

  if (content.includes("ultracite")) {
    const upgraded = upgradeCommandLiterals(content, command);
    if (upgraded !== content) {
      await writeProjectFile(filename, upgraded);
    }
    return;
  }

  let existingConfig: ModuleValue;

  try {
    // Use dynamic import with cache-busting query to avoid stale modules
    const fileUrl = `${pathToFileURL(filename).href}?t=${Date.now()}`;
    // Intentionally loading the user's config file at runtime; the path is not statically known
    const imported = await import(fileUrl);
    existingConfig = imported.default ?? imported;
  } catch {
    warnUnmergeableConfig(filename, packageManager);
    return;
  }

  const jsonConfig = toJsonValue(existingConfig);
  const merged = isJsonObject(jsonConfig)
    ? mergeUltraciteTask(jsonConfig, command)
    : null;

  if (!merged) {
    warnUnmergeableConfig(filename, packageManager);
    return;
  }

  await writeProjectFile(
    filename,
    `module.exports = ${JSON.stringify(merged, null, 2)};\n`
  );
};

// Create fallback config file
const createFallbackConfig = async (
  packageManager: PackageManagerName
): Promise<void> => {
  await writeJson(".lintstagedrc.json", createLintStagedConfig(packageManager));
};

const isYamlFile = (filename: string): boolean =>
  filename.endsWith(".yaml") || filename.endsWith(".yml");

const isTypeScriptFile = (filename: string): boolean =>
  [".ts", ".mts", ".cts"].some((extension) => filename.endsWith(extension));

const COMMONJS_EXPORT_RE = /\bmodule\.exports\b/u;

// Handle updating different config file types
const handleConfigFileUpdate = async (
  filename: string,
  packageManager: PackageManagerName
): Promise<void> => {
  const content = await readFile(filename, "utf-8");

  if (filename.endsWith(".json")) {
    await updateJsonConfig(filename, content, packageManager);
    return;
  }

  // lint-staged reads an extension-less .lintstagedrc as YAML, which JSON is
  // a subset of: keep JSON files JSON, and edit anything else as YAML.
  if (filename === "./.lintstagedrc") {
    await (readJsonObject(content)
      ? updateJsonConfig(filename, content, packageManager)
      : updateYamlConfig(filename, content, packageManager));
    return;
  }

  if (isYamlFile(filename)) {
    await updateYamlConfig(filename, content, packageManager);
    return;
  }

  if (isTypeScriptFile(filename)) {
    // A CommonJS TypeScript config can't be imported portably or edited as
    // an ES module.
    if (COMMONJS_EXPORT_RE.test(content)) {
      warnUnmergeableConfig(filename, packageManager);
      return;
    }

    await updateEsmConfig(filename, content, packageManager);
    return;
  }

  const isEsm = await isProjectEsm();

  if (filename.endsWith(".mjs") || (filename.endsWith(".js") && isEsm)) {
    await updateEsmConfig(filename, content, packageManager);
    return;
  }

  await updateCjsConfig(filename, content, packageManager);
};

export const lintStaged = {
  create: async (packageManager: PackageManagerName) => {
    await createFallbackConfig(packageManager);
  },
  exists: async () => {
    if (configFiles.some((file) => exists(file))) {
      return true;
    }

    if (await hasPackageJsonLintStaged()) {
      return true;
    }

    return (await findPackageYamlWithLintStaged()) !== undefined;
  },
  install: async (packageManager: PackageManager) => {
    await addDevDependency("lint-staged", {
      corepack: false,
      silent: true,
      ...getRootInstallOptions(packageManager),
    });
  },
  update: async (packageManager: PackageManagerName) => {
    // Update the config lint-staged actually uses: a dedicated file wins
    // over package.json, which wins over package.yaml.
    const existingConfigFile = configFiles.find((file) => exists(file));

    if (existingConfigFile) {
      await handleConfigFileUpdate(existingConfigFile, packageManager);
      return;
    }

    if (await hasPackageJsonLintStaged()) {
      await updatePackageJson(packageManager);
      return;
    }

    const packageYaml = await findPackageYamlWithLintStaged();

    if (packageYaml) {
      await updateYamlConfig(
        packageYaml,
        await readFile(packageYaml, "utf-8"),
        packageManager,
        LINT_STAGED_KEY
      );
      return;
    }

    await createFallbackConfig(packageManager);
  },
};
