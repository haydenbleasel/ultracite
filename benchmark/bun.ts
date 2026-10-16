import { spawnSync } from "node:child_process";

// The Bun provider runs `bun lint` and `bun fmt`, which only some Bun releases
// have, so unlike the other providers it can be missing from the machine or
// from a build under test. These checks let the harness skip it then, rather
// than fail the run.

/** How `bun lint --help` starts on a Bun that has the linter. */
export const BUN_LINT_USAGE = "Usage: bun lint";

/** The flag Ultracite runs `bun lint` and `bun fmt` with. */
export const NO_SCRIPT_FLAG = "--no-script";

/**
 * Whether `bun lint --help --all` came from a Bun whose linter Ultracite can
 * run: one that has `--no-script`. A Bun without the linter takes `lint` for
 * a package.json script and prints `Script not found "lint"` instead, and
 * one from before the flag doesn't list it.
 */
export const printsUsableBunLint = (helpOutput: string): boolean =>
  helpOutput.includes(BUN_LINT_USAGE) && helpOutput.includes(NO_SCRIPT_FLAG);

// `--linter <linter>  Linter to use (biome, bun, eslint, oxlint)`. Commander
// may wrap a long description, so the values are split on any whitespace.
const LINTER_CHOICES_RE = /Linter to use \((?<choices>[^)]*)\)/u;
const CHOICE_SEPARATOR_RE = /[\s,]+/u;

/**
 * The `--linter` values an `ultracite init --help` lists. Builds from before
 * 2026-09-28 print `Linter to use` with no list, so they give none.
 */
export const linterChoices = (initHelp: string): string[] =>
  LINTER_CHOICES_RE.exec(initHelp)
    ?.groups?.choices?.split(CHOICE_SEPARATOR_RE)
    .filter(Boolean) ?? [];

/**
 * Whether a build's `ultracite init --help` offers `--linter bun`. Every build
 * that has the Bun provider lists its linters, so one that lists none
 * predates it.
 */
export const acceptsBunLinter = (initHelp: string): boolean =>
  linterChoices(initHelp).includes("bun");

export interface BunOnPath {
  /** Why the Bun provider can't run here, when it can't. */
  missing?: string;
  /** `bun --revision`, such as `1.4.4-canary.1+9510e7415`. */
  revision?: string;
}

/**
 * Check the Bun on PATH for a `bun lint` Ultracite can run. `--help` reaches
 * the linter even where a package.json has a `lint` script.
 */
export const findBunOnPath = (cwd: string): BunOnPath => {
  const revision = spawnSync("bun", ["--revision"], {
    cwd,
    encoding: "utf-8",
  });

  if (revision.error || revision.status !== 0) {
    return { missing: "there's no `bun` on PATH" };
  }

  const version = revision.stdout.trim();

  const help = spawnSync("bun", ["lint", "--help", "--all"], {
    cwd,
    encoding: "utf-8",
  });

  if (!printsUsableBunLint(`${help.stdout ?? ""}${help.stderr ?? ""}`)) {
    return {
      missing: `Bun ${version} on PATH has no \`bun lint ${NO_SCRIPT_FLAG}\` (\`bun lint --help --all\` doesn't list it)`,
      revision: version,
    };
  }

  return { revision: version };
};
