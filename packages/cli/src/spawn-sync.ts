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
  // The system error code of a spawn failure, e.g. "ENOENT" for a command
  // that isn't installed.
  errorCode?: string;
  signal?: string;
  status: number | null;
  stdout?: string;
}

/**
 * Run a command synchronously through execa (which owns Windows spawn
 * semantics), adapted to the spawnSync result shape. Output is always decoded
 * as UTF-8 strings; `shell` is always off so arguments can't be interpreted
 * by a shell. Binaries installed in the project's node_modules/.bin (or a
 * parent's) are found even when the CLI isn't run through a package manager
 * script, npx or bunx, which are what normally put them on PATH.
 */
export const spawnSync = (
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): SpawnSyncResult => {
  const result = execaSync(command, args, {
    ...options,
    preferLocal: true,
    reject: false,
    shell: false,
  });

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- I/O boundary decoding execa's loosely-typed stdout: a string only when piped, absent for ignore/inherit stdio
  const stdout = typeof result.stdout === "string" ? result.stdout : undefined;

  // No exit code and no signal means the process never ran.
  if (result.exitCode === undefined && result.signal === undefined) {
    return {
      error: new Error(result.shortMessage ?? `Failed to run ${command}`),
      errorCode: result.code,
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
