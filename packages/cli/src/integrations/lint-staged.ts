import { readFile } from "node:fs/promises";

import { log } from "@clack/prompts";
import { parse } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";
import { generateCode, parseModule } from "magicast";
import type { ASTNode } from "magicast";
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
import { stagedFileExtensions } from "./staged-files";
import { renderYamlDocument, replaceYamlStrings } from "./yaml-document";

const packageJsonPath = "./package.json";
const packageYamlPaths = ["./package.yaml", "./package.yml"];
const LINT_STAGED_KEY = "lint-staged";

// lint-staged matches a glob without a slash against each file's basename,
// so this covers files in every directory.
const ULTRACITE_PATTERN = `*.{${stagedFileExtensions.join(",")}}`;

// The glob init wrote before v8, which missed .mjs, .cjs, .vue, .svelte,
// .astro, .yaml and other types the linters handle.
const LEGACY_ULTRACITE_PATTERN = "*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}";

// The legacy glob as a quoted key in a JS config, with its task: a list, or a
// single quoted command.
const LEGACY_PATTERN_ENTRY_RE =
  /(?<quote>["'`])\*\.\{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx\}\k<quote>(?<separator>\s*:\s*)(?<task>\[[^\]]*\]|(?<taskQuote>["'`])[^"'`\n]*\k<taskQuote>)/gu;

// A task holding one quoted command, alone or as the only item of a list.
const SINGLE_COMMAND_TASK_RE =
  /^(?:\[\s*)?(?<quote>["'`])(?<command>[^"'`\n]*)\k<quote>(?:\s*,?\s*\])?$/u;

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

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- decoding a user's lint-staged config, which may be any JSON/YAML value
  typeof value === "object" && value !== null && !Array.isArray(value);

const mentionsUltracite = (config: JsonValue): boolean =>
  JSON.stringify(config).includes("ultracite");

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

// Whether a task is nothing but the `ultracite fix` command an init wrote.
const isGeneratedTask = (task: JsonValue): boolean => {
  const commands = Array.isArray(task) ? task : [task];

  return (
    commands.length > 0 &&
    commands.every(
      (entry) =>
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a lint-staged task is a string or an array of strings
        typeof entry === "string" && isGeneratedUltraciteFixCommand(entry)
    )
  );
};

// The glob for a task: the legacy glob an earlier init wrote becomes the
// current one while its task is still only Ultracite's command. A glob or
// task the user wrote or edited is left alone.
const upgradePattern = (
  pattern: string,
  task: JsonValue,
  config: JsonObject
): string =>
  pattern === LEGACY_ULTRACITE_PATTERN &&
  isGeneratedTask(task) &&
  !Object.hasOwn(config, ULTRACITE_PATTERN)
    ? ULTRACITE_PATTERN
    : pattern;

/**
 * `config` with the ultracite task added under its glob: appended to an
 * existing command list, or turned into a list alongside an existing single
 * command. A config that already runs ultracite only has generated commands
 * and the glob an earlier init wrote upgraded. Returns null when the glob
 * holds something we can't extend and so needs a manual edit.
 */
const mergeUltraciteTask = (
  config: JsonObject,
  command: string
): JsonObject | null => {
  if (mentionsUltracite(config)) {
    return Object.fromEntries(
      Object.entries(config).map(([pattern, task]) => {
        const upgradedTask = upgradeCommand(task, command);

        return [upgradePattern(pattern, upgradedTask, config), upgradedTask];
      })
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

// Renames the legacy glob in a YAML config, as upgradePattern does for JSON.
// Returns whether it changed anything.
const upgradeYamlPattern = (config: YAML.YAMLMap): boolean => {
  const pair = config.items.find(
    (item) =>
      YAML.isScalar(item.key) && item.key.value === LEGACY_ULTRACITE_PATTERN
  );

  if (
    !(pair && YAML.isScalar(pair.key) && YAML.isNode(pair.value)) ||
    config.has(ULTRACITE_PATTERN)
  ) {
    return false;
  }

  // The yaml library's toJSON is untyped; a task node holds JSON data.
  const task: JsonValue = pair.value.toJSON();

  if (!isGeneratedTask(task)) {
    return false;
  }

  pair.key.value = ULTRACITE_PATTERN;

  return true;
};

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
    const commandChanged = replaceYamlStrings(
      config,
      isGeneratedUltraciteFixCommand,
      command
    );

    return upgradeYamlPattern(config) || commandChanged;
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

// Replace generated dlx commands that appear as whole string literals, then
// the legacy glob where its task is only a generated command.
const upgradeCommandLiterals = (content: string, command: string): string => {
  const upgraded = content.replaceAll(
    /(?<quote>["'`])(?<value>[^"'`\n]*ultracite fix)\k<quote>/gu,
    (match, quote: string, value: string) =>
      value !== command && isGeneratedUltraciteFixCommand(value)
        ? `${quote}${command}${quote}`
        : match
  );

  if (upgraded.includes(ULTRACITE_PATTERN)) {
    return upgraded;
  }

  return upgraded.replaceAll(
    LEGACY_PATTERN_ENTRY_RE,
    (match, quote: string, separator: string, task: string) => {
      const taskCommand = SINGLE_COMMAND_TASK_RE.exec(task)?.groups?.command;

      return taskCommand !== undefined &&
        isGeneratedUltraciteFixCommand(taskCommand)
        ? `${quote}${ULTRACITE_PATTERN}${quote}${separator}${task}`
        : match;
    }
  );
};

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

const LEADING_WHITESPACE_RE = /^[ \t]*/u;
const TRAILING_COMMA_RE = /^\s*,/u;

// The object literal a CommonJS config assigns to `module.exports`.
const findCjsExportsObject = (content: string): ASTNode | null => {
  let program: ASTNode;

  try {
    program = parseModule(content).$ast;
  } catch {
    return null;
  }

  if (program.type !== "Program") {
    return null;
  }

  for (const statement of program.body) {
    const expression =
      statement.type === "ExpressionStatement" ? statement.expression : null;

    if (
      expression?.type === "AssignmentExpression" &&
      expression.left.type === "MemberExpression" &&
      expression.left.object.type === "Identifier" &&
      expression.left.object.name === "module" &&
      expression.left.property.type === "Identifier" &&
      expression.left.property.name === "exports"
    ) {
      return expression.right.type === "ObjectExpression"
        ? expression.right
        : null;
    }
  }

  return null;
};

/**
 * Adds the Ultracite entry to a CommonJS config's `module.exports = {...}`
 * by inserting it into the source, so comments, variables and computed tasks
 * elsewhere in the file stay as written. Loading the module and writing back
 * its value froze every expression at what it evaluated to on this machine.
 * Returns null for a config that isn't an object literal, or already has an
 * entry for the pattern.
 */
const addEntryToCjsConfig = (
  content: string,
  command: string
): string | null => {
  const config = findCjsExportsObject(content);

  if (config?.type !== "ObjectExpression" || !config.end) {
    return null;
  }

  const hasPattern = config.properties.some(
    (property) =>
      property.type === "ObjectProperty" &&
      property.key.type === "StringLiteral" &&
      property.key.value === ULTRACITE_PATTERN
  );

  if (hasPattern) {
    return null;
  }

  const entry = `${JSON.stringify(ULTRACITE_PATTERN)}: [${JSON.stringify(command)}]`;
  const closing = config.end - 1;
  const last = config.properties.at(-1);

  if (!last?.end) {
    return `${content.slice(0, (config.start ?? closing) + 1)}\n  ${entry},\n${content.slice(closing)}`;
  }

  const lineEnd = content.indexOf("\n", last.end);

  // A one-line object takes the entry on that line.
  if (lineEnd === -1 || lineEnd > closing) {
    return `${content.slice(0, last.end)}, ${entry}${content.slice(last.end)}`;
  }

  // Otherwise it goes on a line of its own after the last entry, below any
  // comment that shares that entry's line.
  const lineStart = content.lastIndexOf("\n", last.start ?? 0) + 1;

  const indent =
    LEADING_WHITESPACE_RE.exec(content.slice(lineStart))?.[0] ?? "  ";

  const comma = TRAILING_COMMA_RE.test(content.slice(last.end)) ? "" : ",";

  return `${content.slice(0, last.end)}${comma}${content.slice(last.end, lineEnd)}\n${indent}${entry},${content.slice(lineEnd)}`;
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

  const updated = addEntryToCjsConfig(content, command);

  if (updated === null) {
    warnUnmergeableConfig(filename, packageManager);

    return;
  }

  await writeProjectFile(filename, updated);
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
