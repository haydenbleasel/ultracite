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

/**
 * Run a command synchronously through execa (which owns Windows spawn
 * semantics), adapted to the spawnSync result shape. Output is always decoded
 * as UTF-8 strings; `shell` is always off so arguments can't be interpreted
 * by a shell.
 */
export const spawnSync = (
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): SpawnSyncResult => {
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
