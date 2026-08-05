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

const STYLE_FILE_GLOB = "**/*.{css,scss,sass,less}";

const styleExtensions = [".css", ".scss", ".sass", ".less"];

const hasStyleExtension = (file: string): boolean => {
  const lowered = file.toLowerCase();
  return styleExtensions.some((extension) => lowered.endsWith(extension));
};

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
          : `${base}/${STYLE_FILE_GLOB}`
      );
    }
  }

  return targets;
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
export const extractAgentFlags = (
  passthrough: string[]
): { agent: FixAgent | null; passthrough: string[] } => {
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

const GLOB_CHARS_RE = /[*?[\]{}]/u;
const PATH_SEPARATOR_RE = /[\\/]/u;
const FILE_EXTENSION_RE = /\.[a-z]{1,10}$/iu;

// A token that names a path, a glob, or an extensioned file is a lint
// target even when it doesn't exist yet; anything else following a flag is
// treated as that flag's value.
const looksLikeTarget = (arg: string, pathExists: PathExists): boolean =>
  pathExists(arg) ||
  GLOB_CHARS_RE.test(arg) ||
  PATH_SEPARATOR_RE.test(arg) ||
  FILE_EXTENSION_RE.test(arg);

const classifyArgs = (
  args: string[],
  pathExists: PathExists
): { files: string[]; passthrough: string[] } => {
  const files: string[] = [];
  const passthrough: string[] = [];
  let previousFlagMayTakeValue = false;

  for (const arg of args) {
    if (arg.startsWith("-") && !pathExists(arg)) {
      passthrough.push(arg);
      // A flag with an inline `=value` already carries its value; anything
      // else may consume the next token as a space-separated value.
      previousFlagMayTakeValue = !arg.includes("=");
      continue;
    }

    // A token right after a flag that doesn't look like a lint target is
    // almost certainly the flag's value (e.g. `--max-warnings 0`) — keep it
    // adjacent to its flag in the linter invocation instead of treating it
    // as a target.
    if (previousFlagMayTakeValue && !looksLikeTarget(arg, pathExists)) {
      passthrough.push(arg);
      previousFlagMayTakeValue = false;
      continue;
    }

    previousFlagMayTakeValue = false;
    files.push(arg);
  }

  return { files, passthrough };
};

export const splitLinterArgs = ({
  commandName,
  parsedArgs,
  pathExists = existsSync,
  rawArgs,
}: SplitLinterArgsOptions): {
  files: string[];
  passthrough: string[];
} => {
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
