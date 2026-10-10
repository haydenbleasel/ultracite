import path from "node:path";
import process from "node:process";

import { execaSync } from "execa";
import { npmRunPathEnv } from "npm-run-path";
import { whichCommandSync } from "which-command";

// Inherit stdin and stderr, and send the child's stdout to this process's
// stderr (fd 2), so everything the command prints lands on stderr.
export type StdoutToStderr = readonly ["inherit", 2, "inherit"];

export interface SpawnSyncOptions {
  maxBuffer?: number;
  stdio?: "ignore" | "inherit" | "pipe" | StdoutToStderr;
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

const WINDOWS_PATH_SEPARATOR_RE = /[/\\:]/u;

// Node sorts Windows environment keys and spawns with the first
// case-insensitive match, so execa reads them the same way.
const getWindowsEnvValue = (
  env: NodeJS.ProcessEnv,
  name: string
): string | undefined => {
  const key = Object.keys(env)
    .toSorted()
    .find((candidate) => candidate.toUpperCase() === name);
  return key === undefined ? undefined : env[key];
};

/**
 * Resolve a command the way execa does on Windows before it spawns: the
 * project's node_modules/.bin directories are prepended to PATH
 * (`preferLocal`), the current directory is searched first unless
 * NODEFAULTCURRENTDIRECTORYINEXEPATH is set, and PATHEXT supplies the
 * extension. Mirrors execa's lib/arguments/command-file.js.
 */
const resolveWindowsCommand = (command: string): string | undefined => {
  const cwd = process.cwd();
  const env = npmRunPathEnv({
    addExecPath: false,
    cwd,
    env: process.env,
    preferLocal: true,
  });
  const envPathExt = getWindowsEnvValue(env, "PATHEXT");
  const extension = path.extname(command);
  const pathExt =
    extension === "" ? envPathExt : `${extension};${envPathExt ?? ""}`;

  if (WINDOWS_PATH_SEPARATOR_RE.test(command)) {
    return whichCommandSync(path.resolve(cwd, command), { cwd, pathExt });
  }

  const searchPath = getWindowsEnvValue(env, "PATH") ?? "";

  if (
    getWindowsEnvValue(env, "NODEFAULTCURRENTDIRECTORYINEXEPATH") === undefined
  ) {
    return whichCommandSync(command, { cwd, path: searchPath, pathExt });
  }

  for (const directory of searchPath.split(path.delimiter)) {
    const unquoted =
      directory.length > 1 &&
      directory.startsWith('"') &&
      directory.endsWith('"')
        ? directory.slice(1, -1)
        : directory;

    if (unquoted === "") {
      continue;
    }

    const resolved = whichCommandSync(path.resolve(cwd, unquoted, command), {
      cwd,
      pathExt,
    });

    if (resolved !== undefined) {
      return resolved;
    }
  }

  return undefined;
};

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
  // On Windows execa runs a command it can't resolve through cmd.exe, which
  // prints "is not recognized" and exits 1 instead of failing with ENOENT.
  // Resolve it first so a missing tool is reported as missing, as on POSIX.
  if (
    process.platform === "win32" &&
    resolveWindowsCommand(command) === undefined
  ) {
    return {
      error: new Error(`Command failed with ENOENT: ${command}`),
      errorCode: "ENOENT",
      status: null,
    };
  }

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
