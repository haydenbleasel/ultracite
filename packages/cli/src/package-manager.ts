import { readFileSync } from "node:fs";
import process from "node:process";

import { detectPackageManager } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

import { UltraciteSetupError } from "./config-resolution";
import { findNearestFile, isMonorepo } from "./utils";

export const supportedPackageManagers = [
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "deno",
  "nub",
  "aube",
] as const satisfies readonly PackageManagerName[];

// Widened view of the list so `.includes` can take an arbitrary string.
const supportedPackageManagerNames: readonly string[] =
  supportedPackageManagers;

export const isSupportedPackageManagerName = (
  name: string
): name is PackageManagerName => supportedPackageManagerNames.includes(name);

export const assertSupportedPackageManagerName = (
  name: string
): PackageManagerName => {
  if (isSupportedPackageManagerName(name)) {
    return name;
  }

  throw new UltraciteSetupError(
    `Unsupported package manager "${name}". Supported package managers: ${supportedPackageManagers.join(", ")}.`
  );
};

// Yarn 2+ (Berry) writes .yarnrc.yml, and its yarn.lock starts with a
// __metadata block that Yarn 1 lockfiles don't have.
const YARN_BERRY_LOCKFILE_RE = /^__metadata:/mu;

const isYarnBerryProject = (cwd: string): boolean => {
  if (findNearestFile([".yarnrc.yml"], cwd)) {
    return true;
  }

  const lockfile = findNearestFile(["yarn.lock"], cwd);

  try {
    return lockfile
      ? YARN_BERRY_LOCKFILE_RE.test(readFileSync(lockfile.path, "utf-8"))
      : false;
  } catch {
    return false;
  }
};

/**
 * nypm passes Yarn 1's `-W` (workspace root) flag unless it knows the Yarn
 * major version, and Yarn 2+ rejects that flag. The version is only known when
 * package.json's `packageManager` field names it, so fill it in from the
 * project's Yarn files otherwise. Any major other than "1" selects nypm's
 * Yarn 2+ behaviour.
 */
const withYarnMajorVersion = (
  packageManager: PackageManager,
  cwd: string
): PackageManager => {
  if (packageManager.name !== "yarn" || packageManager.majorVersion) {
    return packageManager;
  }

  return {
    ...packageManager,
    majorVersion: isYarnBerryProject(cwd) ? "2" : "1",
  };
};

export const normalizePackageManager = (
  packageManager: PackageManager,
  cwd = process.cwd()
): PackageManager => {
  const name = assertSupportedPackageManagerName(packageManager.name);

  return withYarnMajorVersion(
    {
      ...packageManager,
      command: name,
      name,
    },
    cwd
  );
};

/**
 * The package manager a `--pm` flag names. When it's the one the project
 * uses, the detected details (such as the Yarn major version from
 * `packageManager`) are kept, so the right flags are passed.
 */
export const resolveRequestedPackageManager = async (
  requested: string,
  cwd = process.cwd()
): Promise<PackageManager> => {
  const name = assertSupportedPackageManagerName(requested);
  const detected = await detectPackageManager(cwd);

  return normalizePackageManager(
    detected?.name === name ? detected : { command: name, name },
    cwd
  );
};

interface RootInstallOptions {
  packageManager: PackageManager;
  workspace: boolean;
}

export const getRootInstallOptions = (
  packageManager: PackageManager
): RootInstallOptions => {
  // npm's `--workspaces` installs in every workspace package — for a root
  // dev dependency we want the default (no flag), so the npm root install
  // doesn't fail with "No workspaces found!" when patterns match nothing.
  // pnpm, nub and aube get --workspace-root, and Yarn 1 gets -W.
  if (!isMonorepo() || packageManager.name === "npm") {
    return { packageManager, workspace: false };
  }

  return { packageManager, workspace: true };
};
