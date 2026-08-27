import { spawnSync as nodeSpawnSync } from "node:child_process";

import { execaSync } from "execa";

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

type SpawnSyncImplementation = (
  command: string,
  args: string[],
  options?: SpawnSyncOptions
) => SpawnSyncResult;

/**
 * execa's default output ceiling. Node's native default is only 1 MiB, so the
 * native path applies this explicitly to keep the two implementations
 * interchangeable for callers that don't set `maxBuffer`.
 */
const DEFAULT_MAX_BUFFER = 1000 * 1000 * 100;

/**
 * Run a command through execa's sync API, which owns the Windows spawn
 * semantics: it resolves `.cmd`/`.bat` shims such as `node_modules/.bin/oxlint`
 * via PATHEXT, something libuv won't do without a shell.
 */
export const execaSpawnSync: SpawnSyncImplementation = (
  command,
  args,
  options = {}
) => {
  const result = execaSync(command, args, {
    ...options,
    reject: false,
    shell: false,
  });

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- I/O boundary decoding execa's loosely-typed stdout: a string only when piped, absent for ignore/inherit stdio
  const stdout = typeof result.stdout === "string" ? result.stdout : undefined;

  // No exit code and no signal means the process never ran.
  if (result.exitCode === undefined && result.signal === undefined) {
    return {
      error: new Error(result.shortMessage ?? `Failed to run ${command}`),
      status: null,
      stdout,
    };
  }

  return {
    signal: result.signal,
    status: result.signal === undefined ? (result.exitCode ?? null) : null,
    stdout,
  };
};

/**
 * Run a command through the native child-process API. Mirrors execa's
 * defaults (`windowsHide`, `maxBuffer`) so the two paths behave the same.
 */
export const nativeSpawnSync: SpawnSyncImplementation = (
  command,
  args,
  options = {}
) => {
  const result = nodeSpawnSync(command, args, {
    ...options,
    encoding: "utf-8",
    maxBuffer: options.maxBuffer ?? DEFAULT_MAX_BUFFER,
    shell: false,
    windowsHide: true,
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

/**
 * Bun's `spawnSync` on Windows doesn't return the `output` array that execa's
 * sync path dereferences (`TypeError: undefined is not an object (evaluating
 * 'output.map')`), so under Bun the native API is used directly. Node keeps
 * execa for its Windows command resolution.
 */
const isBun = process.versions.bun !== undefined;

/**
 * Run a command synchronously, adapted to the spawnSync result shape. Output
 * is always decoded as UTF-8 strings; `shell` is always off so arguments can't
 * be interpreted by a shell.
 */
export const spawnSync: SpawnSyncImplementation = isBun
  ? nativeSpawnSync
  : execaSpawnSync;
