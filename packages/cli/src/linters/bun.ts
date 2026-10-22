import { UltraciteSetupError } from "../config-resolution";
import { MIN_BUN_VERSION } from "../dependencies";
import { spawnSync } from "../spawn-sync";
import type { SpawnSyncOptions, SpawnSyncResult } from "../spawn-sync";

/**
 * Where the Bun provider's oxlint.config.ts and oxfmt.config.ts import
 * `defineConfig` from (see config/bun/index.mjs). They're otherwise the
 * Oxlint provider's files, so this import is also how a Bun project is told
 * apart from an Oxlint one.
 */
export const BUN_CONFIG_MODULE = "ultracite/bun";

type BunTool = "fmt" | "lint";

// Without it, `bun lint` and `bun fmt` run the package.json script of the
// same name when the project has one ("lint": "next lint").
const NO_SCRIPT = "--no-script";

/**
 * Run Bun's own `bun lint` or `bun fmt`, whatever scripts the project has.
 */
export const spawnBun = (
  tool: BunTool,
  args: string[],
  options: SpawnSyncOptions = {}
): SpawnSyncResult => spawnSync("bun", [tool, NO_SCRIPT, ...args], options);

/**
 * The flags in `passthrough` that pick files from Git: `--staged`, and
 * `--changed` with or without a ref. `ultracite check` and `fix` pass the
 * other flags to `bun lint` alone, but these go to `bun fmt` as well, so
 * both tools work on the same files. With `--staged`, each also stages the
 * files it fixes again, which is what a pre-commit hook needs.
 */
export const bunFileSelectionArgs = (passthrough: string[]): string[] =>
  passthrough.filter(
    (arg) =>
      arg === "--staged" || arg === "--changed" || arg.startsWith("--changed=")
  );

// `  lint   Lint JavaScript and TypeScript, like ESLint` in `bun --help`'s
// command column. Further in, under `run`, the help shows a random example
// script name, which can be `lint`.
const BUN_LINT_COMMAND_RE = /^ {2}lint\s/mu;

const BUN_LINT_USAGE = "Usage: bun lint";

/**
 * Whether the Bun on PATH has `bun lint` and `bun fmt`, with the
 * `--no-script` flag spawnBun relies on. A Bun without the linter, which
 * includes every release build so far (oven-sh/bun#46438), runs the
 * project's `lint` script for `bun lint`, even with `--help`. So the command
 * list in `bun --help` is checked first, and only a Bun that lists `lint` is
 * asked for `bun lint --help --all`. That reaches the linter whatever
 * scripts the project has, and is the only help that lists the flag.
 */
export const hasBunLint = (): boolean => {
  const commands = spawnSync("bun", ["--help"], { stdio: "pipe" }).stdout ?? "";

  if (!BUN_LINT_COMMAND_RE.test(commands)) {
    return false;
  }

  const help =
    spawnSync("bun", ["lint", "--help", "--all"], { stdio: "pipe" }).stdout ??
    "";

  return help.startsWith(BUN_LINT_USAGE) && help.includes(NO_SCRIPT);
};

let bunCanLint: boolean | undefined;

/**
 * Throw a setup error unless the Bun on PATH has `bun lint` and `bun fmt`.
 * An older Bun exits 1 on them, which would otherwise read as lint
 * problems. The answer is cached for the process.
 */
export const assertBunCanLint = (): void => {
  bunCanLint ??= hasBunLint();

  if (!bunCanLint) {
    throw new UltraciteSetupError(
      `The Bun provider runs \`bun lint\` and \`bun fmt\`, which need Bun ${MIN_BUN_VERSION} or later. Install or upgrade Bun (\`bun upgrade\`) and try again; \`ultracite doctor\` checks the setup.`
    );
  }
};

/** Forget the cached capability check (for tests). */
export const resetBunCapabilityCache = (): void => {
  bunCanLint = undefined;
};
