import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { UltraciteSetupError } from "./config-resolution";

type PathExists = (path: string) => boolean;

interface SplitLinterArgsOptions {
  commandName: "check" | "fix";
  parsedArgs: string[];
  pathExists?: PathExists;
  rawArgs?: string[];
}

const getCommandArgs = (
  commandName: SplitLinterArgsOptions["commandName"],
  parsedArgs: string[],
  rawArgs?: string[]
): string[] => {
  const commandIndex = rawArgs?.indexOf(commandName) ?? -1;

  if (!rawArgs || commandIndex === -1) {
    return parsedArgs;
  }

  return rawArgs.slice(commandIndex + 1);
};

export const normalizeFileArgs = (files: string[]): string[] =>
  files.map((file) => (file.startsWith("-") ? `./${file}` : file));

const GLOB_CHARS_RE = /[*?[\]{}]/u;

export const isGlobPattern = (arg: string): boolean => GLOB_CHARS_RE.test(arg);

// The Stylelint preset parses SCSS and Less through custom syntaxes. The
// indented `.sass` syntax has no maintained PostCSS parser, so it is left out
// rather than failing every file with CssSyntaxError.
const STYLE_FILE_GLOB = "**/*.{css,scss,less}";

const styleExtensions = [".css", ".scss", ".less"];

// Stylelint expands targets as globs, so a directory named like a Next.js
// route group (`app/(marketing)`) or dynamic segment matches nothing unless
// its glob metacharacters are escaped.
const GLOB_SPECIAL_CHARS_RE = /[!()*+?@[\]{|}]/gu;

const escapeGlobPath = (dir: string): string =>
  dir.replaceAll(GLOB_SPECIAL_CHARS_RE, String.raw`\$&`);

const hasExtension = (file: string, extensions: string[]): boolean => {
  const lowered = file.toLowerCase();
  return extensions.some((extension) => lowered.endsWith(extension));
};

const hasStyleExtension = (file: string): boolean =>
  hasExtension(file, styleExtensions);

const isDirectory = (file: string): boolean => {
  try {
    return statSync(file).isDirectory();
  } catch {
    return false;
  }
};

/**
 * Stylelint has no extension filtering of its own, so handing it the same
 * targets as ESLint/Prettier makes it parse .ts/.json files as CSS and fail.
 * Style files pass through, extension-less targets (directories) become
 * style-scoped globs, and other files are dropped. An empty result means
 * Stylelint has nothing to lint and should be skipped.
 */
export const toStylelintTargets = (files: string[]): string[] => {
  if (files.length === 0) {
    return [STYLE_FILE_GLOB];
  }

  const targets: string[] = [];

  for (const file of files) {
    if (hasStyleExtension(file)) {
      targets.push(file);
      continue;
    }

    // extname alone misses directories with a dot in their name (app.web),
    // so also stat real paths. Globs never exist on disk and keep relying on
    // the extname check.
    if (path.extname(file) === "" || isDirectory(file)) {
      // Stylelint's glob engine treats backslashes as escapes, so Windows
      // path separators must be normalized for the pattern to match.
      const normalized = path.sep === "\\" ? file.replaceAll("\\", "/") : file;
      const base = normalized.replace(/\/+$/u, "");
      targets.push(
        base === "." || base === ""
          ? STYLE_FILE_GLOB
          : `${escapeGlobPath(base)}/${STYLE_FILE_GLOB}`
      );
    }
  }

  return targets;
};

// The file types Oxlint lints. It has no option to extend them, and an explicit
// file outside this list makes it exit 1 with "No files found to lint".
const oxlintExtensions = [
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".vue",
  ".astro",
  ".svelte",
];

/**
 * Oxlint fails on an explicit file it does not lint (a README, package.json,
 * a Dockerfile), so those are dropped. Directories and globs pass through,
 * since Oxlint filters their contents itself. An empty result means Oxlint
 * has nothing to lint and should be skipped.
 */
export const toOxlintTargets = (files: string[]): string[] => {
  if (files.length === 0) {
    return ["."];
  }

  return files.filter(
    (file) =>
      hasExtension(file, oxlintExtensions) ||
      isGlobPattern(file) ||
      isDirectory(file)
  );
};

export type FixAgent = "claude" | "codex";

// A Map, not a plain object: passthrough can contain arbitrary user tokens
// (everything before a `--` separator), and an object lookup would resolve
// inherited keys like "constructor" as if they were agent flags.
const agentFlags = new Map<string, FixAgent>([
  ["--claude", "claude"],
  ["--codex", "codex"],
]);

/**
 * `--claude` and `--codex` are Ultracite's own flags, but `splitLinterArgs`
 * classifies every `-`-prefixed token as linter passthrough, so they must be
 * stripped here before the passthrough reaches oxlint/biome/eslint.
 */
export const extractAgentFlags = (passthrough: string[]) => {
  const agents = new Set<FixAgent>();
  const remaining: string[] = [];

  for (const arg of passthrough) {
    const agent = agentFlags.get(arg);

    if (agent) {
      agents.add(agent);
      continue;
    }

    remaining.push(arg);
  }

  if (agents.size > 1) {
    throw new UltraciteSetupError("Pass either --claude or --codex, not both.");
  }

  const [agent = null] = agents;

  return { agent, passthrough: remaining };
};

/**
 * `--hook` is Ultracite's own flag for agent post-edit hooks: lint only the file
 * the agent's payload names. Stripped for the same reason as the agent flags.
 */
export const extractHookFlag = (passthrough: string[]) => ({
  hook: passthrough.includes("--hook"),
  passthrough: passthrough.filter((arg) => arg !== "--hook"),
});

const PATH_SEPARATOR_RE = /[\\/]/u;
const FILE_EXTENSION_RE = /\.[a-z]{1,10}$/iu;

// Linter flags that take a value, whose value often looks like a lint target
// (a path, a glob, a `plugin/rule` name): `--tsconfig tsconfig.json`,
// `--only lint/suspicious`, `-c .oxlintrc.json`. The token after one is
// always its value.
const valueFlags = new Set([
  // Biome
  "--config-path",
  "--diagnostic-level",
  "--files-max-size",
  "--log-file",
  "--log-kind",
  "--log-level",
  "--log-path",
  "--max-diagnostics",
  "--only",
  "--reporter",
  "--reporter-file",
  "--since",
  "--skip",
  "--stdin-file-path",
  "--vcs-root",
  // ESLint
  "-c",
  "-f",
  "-o",
  "--cache-file",
  "--cache-location",
  "--cache-strategy",
  "--concurrency",
  "--config",
  "--ext",
  "--fix-type",
  "--flag",
  "--format",
  "--global",
  "--ignore-pattern",
  "--max-warnings",
  "--output-file",
  "--parser",
  "--parser-options",
  "--plugin",
  "--report-unused-disable-directives-severity",
  "--report-unused-inline-configs",
  "--rule",
  "--stdin-filename",
  "--suppress-rule",
  "--suppressions-location",
  // Oxlint
  "-A",
  "-D",
  "-W",
  "--allow",
  "--deny",
  "--ignore-path",
  "--threads",
  "--tsconfig",
  "--warn",
]);

// Flags known to take no value, including Ultracite's own. The token after
// one is never its value, so `fix --hook app` lints `app` even when `app`
// doesn't exist yet.
const booleanFlags = new Set([
  "--cache",
  "--changed",
  "--claude",
  "--codex",
  "--deny-warnings",
  "--disable-nested-config",
  "--error-on-warnings",
  "--fix",
  "--fix-dangerously",
  "--fix-suggestions",
  "--hook",
  "--quiet",
  "--report-unused-disable-directives",
  "--silent",
  "--staged",
  "--type-aware",
  "--type-check",
  "--unsafe",
  "--verbose",
  "--write",
]);

type FlagValue = "maybe" | "no" | "yes";

const takesValue = (flag: string): FlagValue => {
  // A flag with an inline `=value` already carries its value.
  if (flag.includes("=")) {
    return "no";
  }

  if (valueFlags.has(flag)) {
    return "yes";
  }

  return booleanFlags.has(flag) || flag.startsWith("--no-") ? "no" : "maybe";
};

// A token that names a path, a glob, or an extensioned file is a lint
// target even when it doesn't exist yet; anything else following a flag is
// treated as that flag's value.
const looksLikeTarget = (arg: string, pathExists: PathExists): boolean =>
  pathExists(arg) ||
  isGlobPattern(arg) ||
  PATH_SEPARATOR_RE.test(arg) ||
  FILE_EXTENSION_RE.test(arg);

const classifyArgs = (args: string[], pathExists: PathExists) => {
  const files: string[] = [];
  const passthrough: string[] = [];
  let previousFlag: FlagValue = "no";

  for (const arg of args) {
    if (arg.startsWith("-") && !pathExists(arg)) {
      passthrough.push(arg);
      previousFlag = takesValue(arg);
      continue;
    }

    // The value of a known value flag stays with it, even when it looks
    // like a target (`--tsconfig tsconfig.json`). After an unknown flag, a
    // token that doesn't look like a lint target is almost certainly the
    // flag's value (e.g. `--max-warnings 0`) — keep it adjacent to its flag
    // in the linter invocation instead of treating it as a target.
    const isValue =
      previousFlag === "yes" ||
      (previousFlag === "maybe" && !looksLikeTarget(arg, pathExists));
    previousFlag = "no";

    if (isValue) {
      passthrough.push(arg);
    } else {
      files.push(arg);
    }
  }

  return { files, passthrough };
};

export const splitLinterArgs = ({
  commandName,
  parsedArgs,
  pathExists = existsSync,
  rawArgs,
}: SplitLinterArgsOptions) => {
  const args = getCommandArgs(commandName, parsedArgs, rawArgs);
  const separatorIndex = args.indexOf("--");

  if (separatorIndex !== -1) {
    // Everything after `--` is a file, but positionals before it (e.g.
    // `ultracite fix src -- other.ts`) are still lint targets — dropping
    // them into passthrough would silently widen formatter runs to `.`.
    const classified = classifyArgs(args.slice(0, separatorIndex), pathExists);
    return {
      files: [...classified.files, ...args.slice(separatorIndex + 1)],
      passthrough: classified.passthrough,
    };
  }

  return classifyArgs(args, pathExists);
};
