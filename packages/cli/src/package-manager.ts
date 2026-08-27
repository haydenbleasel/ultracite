import type { PackageManager, PackageManagerName } from "nypm";

import { isMonorepo } from "./utils";

const supportedPackageManagers = [
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

  throw new Error(
    `Unsupported package manager "${name}". Supported package managers: ${supportedPackageManagers.join(", ")}.`
  );
};

export const normalizePackageManager = (
  packageManager: PackageManager
): PackageManager => {
  const name = assertSupportedPackageManagerName(packageManager.name);

  return {
    ...packageManager,
    command: name,
    name,
  };
};

// Package managers that speak pnpm's CLI but that nypm can't select the
// workspace root for: nypm's `workspace` option only emits a root flag for
// pnpm, npm and yarn, so `nub add` in a monorepo would run without `-w` and be
// refused. nypm builds flags from `packageManager.name` but executes
// `packageManager.command`, so presenting these as pnpm yields e.g.
// `nub add --workspace-root --save-dev ultracite`, which nub accepts.
// Remove once nypm handles nub/aube in getWorkspaceArgs upstream.
const pnpmCompatiblePackageManagers = new Set<PackageManagerName>([
  "nub",
  "aube",
]);

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
  if (!isMonorepo() || packageManager.name === "npm") {
    return { packageManager, workspace: false };
  }

  if (pnpmCompatiblePackageManagers.has(packageManager.name)) {
    return {
      packageManager: { ...packageManager, name: "pnpm" },
      workspace: true,
    };
  }

  return { packageManager, workspace: true };
};
