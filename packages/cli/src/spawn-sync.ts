import type * as ChildProcess from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const childProcess: typeof ChildProcess = require("node:child_process");

const { spawnSync: nodeSpawnSync } = childProcess;

export interface SpawnSyncOptions {
  maxBuffer?: number;
  stdio?: "ignore" | "inherit" | "pipe";
}

/**
 * The child_process.spawnSync result shape the callers consume: `error` for
 * spawn failures (e.g. the binary is missing), a null `status` with `signal`
 * set for signal kills, and the exit code otherwise.
 */
export interface SpawnSyncResult {
  error?: Error;
  signal?: string;
  status: number | null;
  stdout?: string;
}

/**
 * Run a command synchronously through the native child-process API, adapted to
 * the result shape callers consume. Output is decoded as UTF-8 strings; the
 * shell is always off so arguments cannot be interpreted by a shell.
 */
export const spawnSync = (
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): SpawnSyncResult => {
  const result = nodeSpawnSync(command, args, {
    ...options,
    encoding: "utf-8",
    maxBuffer: options.maxBuffer ?? 100_000_000,
    shell: false,
  });

  const stdout = result.stdout ?? undefined;

  if (result.error) {
    return {
      error: result.error,
      status: null,
      stdout,
    };
  }

  if (result.signal) {
    return {
      signal: result.signal,
      status: null,
      stdout,
    };
  }

  return {
    status: result.status ?? null,
    stdout,
  };
};
