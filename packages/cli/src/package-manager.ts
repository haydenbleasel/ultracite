import { existsSync } from "node:fs";
import path from "node:path";

import { detectPackageManager as detectNypmPackageManager } from "nypm";
import type { PackageManager, PackageManagerName } from "nypm";

const supportedPackageManagers = [
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "deno",
] as const satisfies readonly PackageManagerName[];

export const isSupportedPackageManagerName = (
  name: string
): name is PackageManagerName =>
  (supportedPackageManagers as readonly string[]).includes(name);

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

export const preferBunPackageManager = <T extends PackageManager | undefined>(
  detected: T,
  hasBunLockfile: boolean
): T => {
  if (detected?.name !== "npm" || !hasBunLockfile) {
    return detected;
  }

  return {
    ...detected,
    command: "bun",
    name: "bun",
  } as T;
};

export const detectPackageManager = async (cwd: string) =>
  preferBunPackageManager(
    await detectNypmPackageManager(cwd),
    existsSync(path.join(cwd, "bun.lock"))
  );
