import type { PackageManager, PackageManagerName } from "nypm";

const supportedPackageManagers = [
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "deno",
  "nub",
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
