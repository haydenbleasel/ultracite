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
