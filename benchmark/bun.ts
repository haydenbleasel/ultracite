import { spawnSync } from "node:child_process";
import process from "node:process";

// The Bun provider runs `bun lint` and `bun fmt`, which only some Bun releases
// have, so unlike the other providers it can be missing from the machine or
// from a build under test. These checks let the harness skip it then, rather
// than fail the run.

/** How `bun lint --help` starts on a Bun that has the linter. */
export const BUN_LINT_USAGE = "Usage: bun lint";

/**
 * Whether `bun lint --help` printed the linter's usage. A Bun without the
 * linter takes `lint` for a package.json script and prints `Script not found
 * "lint"` instead.
 */
export const printsBunLintUsage = (helpOutput: string): boolean =>
  helpOutput.includes(BUN_LINT_USAGE);

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
 * Check the Bun on PATH for `bun lint`. Runs in `cwd`, which should have no
 * package.json: an older Bun runs a package.json `lint` script of that name,
 * and so does a newer one unless npm_lifecycle_event says it's already in
 * that script, which is how the CLI starts it too.
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

  const help = spawnSync("bun", ["lint", "--help"], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, npm_lifecycle_event: "lint" },
  });

  if (!printsBunLintUsage(`${help.stdout ?? ""}${help.stderr ?? ""}`)) {
    return {
      missing: `Bun ${version} on PATH has no \`bun lint\` (\`bun lint --help\` doesn't print "${BUN_LINT_USAGE}")`,
      revision: version,
    };
  }

  return { revision: version };
};
