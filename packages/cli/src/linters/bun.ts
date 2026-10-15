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

/**
 * Run `bun lint` or `bun fmt`. Each runs the package.json script of the same
 * name instead, when the project has one ("lint": "next lint"), unless it's
 * already running inside that script. Bun tells that from
 * npm_lifecycle_event, so it's set to the tool's own name.
 */
export const spawnBun = (
  tool: BunTool,
  args: string[],
  options: SpawnSyncOptions = {}
): SpawnSyncResult =>
  spawnSync("bun", [tool, ...args], {
    ...options,
    env: { ...options.env, npm_lifecycle_event: tool },
  });

const BUN_LINT_USAGE = "Usage: bun lint";

/**
 * Whether the Bun on PATH has `bun lint` (and `bun fmt`, which shipped with
 * it). An older Bun reports `Script not found "lint"` instead of its usage.
 */
export const hasBunLint = (): boolean =>
  spawnBun("lint", ["--help"], { stdio: "pipe" }).stdout?.startsWith(
    BUN_LINT_USAGE
  ) ?? false;

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
