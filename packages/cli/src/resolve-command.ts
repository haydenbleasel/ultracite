import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

export interface ResolveCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

const DEFAULT_WINDOWS_PATH_EXT =
  ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC";

const getPathValue = (
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform
): string => {
  if (platform !== "win32") {
    return env.PATH ?? "";
  }

  const key = Object.keys(env).find((name) => name.toUpperCase() === "PATH");
  if (key === undefined) {
    return "";
  }
  return env[key] ?? "";
};

const splitSearchPath = (value: string, platform: NodeJS.Platform): string[] =>
  value
    .split(platform === "win32" ? ";" : ":")
    .map((entry) => {
      const trimmed = entry.trim();
      return trimmed.length > 1 &&
        trimmed.startsWith('"') &&
        trimmed.endsWith('"')
        ? trimmed.slice(1, -1)
        : trimmed;
    })
    .filter((entry) => entry !== "");

const getWindowsExtensions = (env: NodeJS.ProcessEnv): string[] =>
  (env.PATHEXT || DEFAULT_WINDOWS_PATH_EXT)
    .split(";")
    .map((extension) => extension.trim())
    .filter((extension) => extension !== "");

const ancestorBinDirs = (cwd: string, pathEntries: string[]): string[] => {
  const dirs: string[] = [];
  let current = path.resolve(cwd);

  while (true) {
    const bin = path.join(current, "node_modules", ".bin");
    if (!pathEntries.includes(bin) && !dirs.includes(bin)) {
      dirs.push(bin);
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return dirs;
};

const hasSeparator = (command: string, platform: NodeJS.Platform): boolean =>
  platform === "win32"
    ? command.includes("/") || command.includes("\\") || command.includes(":")
    : command.includes("/");

const firstExisting = (candidates: string[]): string | undefined =>
  candidates.find((candidate) => {
    try {
      return existsSync(candidate);
    } catch {
      return false;
    }
  });

/**
 * Resolve a bare command to an executable file, mirroring the lookup the
 * spawn wrapper relies on: project and ancestor `node_modules/.bin`
 * directories take precedence over `PATH`, and on Windows `PATHEXT`
 * supplies the executable extension. Only `node:fs`/`node:path` built-ins
 * are used so the check works on every Node version the CLI supports.
 */
export const resolveCommand = (
  command: string,
  options: ResolveCommandOptions = {}
): string | undefined => {
  if (command === "") {
    return undefined;
  }

  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;

  if (hasSeparator(command, platform)) {
    const base = path.resolve(cwd, command);
    if (platform !== "win32") {
      return existsSync(base) ? base : undefined;
    }
    const extensions = getWindowsExtensions(env);
    const candidates = command.includes(".")
      ? [base, ...extensions.map((extension) => `${base}${extension}`)]
      : extensions.map((extension) => `${base}${extension}`);
    return firstExisting(candidates);
  }

  const pathEntries = splitSearchPath(getPathValue(env, platform), platform);
  const searchDirs =
    platform === "win32"
      ? [
          path.resolve(cwd),
          ...ancestorBinDirs(cwd, pathEntries),
          ...pathEntries,
        ]
      : [...ancestorBinDirs(cwd, pathEntries), ...pathEntries];

  if (platform !== "win32") {
    for (const directory of searchDirs) {
      const candidate = path.join(directory, command);
      if (firstExisting([candidate]) !== undefined) {
        return candidate;
      }
    }
    return undefined;
  }

  const extensions = getWindowsExtensions(env);
  for (const directory of searchDirs) {
    const base = path.join(directory, command);
    const match = firstExisting(
      extensions.map((extension) => `${base}${extension}`)
    );
    if (match !== undefined) {
      return match;
    }
  }
  return undefined;
};

export const isCommandAvailable = (
  command: string,
  options: ResolveCommandOptions = {}
): boolean => resolveCommand(command, options) !== undefined;
