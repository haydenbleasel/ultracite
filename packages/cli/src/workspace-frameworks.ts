import path from "node:path";

import { UltraciteSetupError } from "./config-resolution";
import { options } from "./data/options";
import type { Framework } from "./data/options";
import { readPackageJsonSync } from "./schemas";
import type { PackageJson } from "./schemas";
import { exists } from "./utils";

/** A directory with framework presets of its own, on top of the root's. */
export interface WorkspaceFrameworks {
  /** Project-relative, with forward slashes and no leading `./`. */
  dir: string;
  frameworks: Framework[];
}

const SELECTION_RE = /^(?<dir>[^=]+)=(?<framework>[^=]+)$/u;
const SEPARATOR_RE = /[\\/]+/u;

// The directory as a project-relative path with forward slashes, or null for
// one that isn't a subdirectory of the project.
const normalizeDir = (dir: string): string | null => {
  if (path.posix.isAbsolute(dir) || path.win32.isAbsolute(dir)) {
    return null;
  }

  const segments = dir
    .split(SEPARATOR_RE)
    .filter((segment) => segment !== "" && segment !== ".");

  if (segments.length === 0 || segments.includes("..")) {
    return null;
  }

  return segments.join("/");
};

const isFramework = (value: string): value is Framework =>
  options.frameworks.some((framework) => framework === value);

/**
 * Parse `--workspace-framework <path>=<framework>` values, grouping the
 * frameworks by directory. Every value is checked before init changes
 * anything, including that the directory exists, so a typo can't create a
 * stray directory holding a config.
 */
export const parseWorkspaceFrameworks = (
  values: readonly string[] = []
): WorkspaceFrameworks[] => {
  const frameworksByDir = new Map<string, Framework[]>();

  for (const value of values) {
    const groups = SELECTION_RE.exec(value)?.groups;
    const dir = groups?.dir ? normalizeDir(groups.dir.trim()) : null;
    const framework = groups?.framework?.trim();

    if (!dir || !framework) {
      throw new UltraciteSetupError(
        `Invalid --workspace-framework value "${value}". Use <path>=<framework> with a path inside the project, for example apps/web=react.`
      );
    }

    if (!isFramework(framework)) {
      throw new UltraciteSetupError(
        `Unknown framework "${framework}" in --workspace-framework "${value}". Valid values: ${options.frameworks.join(", ")}.`
      );
    }

    if (!exists(`./${dir}`)) {
      throw new UltraciteSetupError(
        `--workspace-framework "${value}" points at ${dir}, which doesn't exist.`
      );
    }

    const frameworks = frameworksByDir.get(dir) ?? [];
    if (!frameworks.includes(framework)) {
      frameworks.push(framework);
    }
    frameworksByDir.set(dir, frameworks);
  }

  return [...frameworksByDir].map(([dir, frameworks]) => ({
    dir,
    frameworks,
  }));
};

/** The relative path from a workspace directory back to the project root. */
export const pathToRoot = (dir: string): string =>
  dir
    .split("/")
    .map(() => "..")
    .join("/");

/**
 * The package.json that owns a workspace directory: the nearest one at or
 * above it, short of the project root's. Undefined when the directory is part
 * of the root package.
 */
export const readWorkspacePackageJson = (
  dir: string
): PackageJson | undefined => {
  const segments = dir.split("/");

  for (let depth = segments.length; depth > 0; depth -= 1) {
    const packageJson = readPackageJsonSync(
      `${segments.slice(0, depth).join("/")}/package.json`
    );

    if (packageJson) {
      return packageJson;
    }
  }

  return undefined;
};
