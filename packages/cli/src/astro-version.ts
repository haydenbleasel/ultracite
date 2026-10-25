import process from "node:process";

import { findWorkspaces } from "find-workspaces";
import { major, minVersion, valid, validRange } from "semver";

import { findInstalledPackage } from "./config-resolution";
import { readPackageJson } from "./schemas";

interface DependencyFields {
  dependencies?: Record<string, string | undefined>;
  devDependencies?: Record<string, string | undefined>;
}

const declaredAstroRange = (pkg: DependencyFields | undefined) =>
  pkg?.dependencies?.astro ?? pkg?.devDependencies?.astro;

// The installed version, or else the lowest one the declared range allows.
// A range semver can't read (`catalog:`, `workspace:*`) with nothing
// installed gives null.
const astroMajorVersion = (dir: string, range: string): number | null => {
  const installed = findInstalledPackage("astro", dir)?.manifest.version;

  if (installed && valid(installed)) {
    return major(installed);
  }

  const lowest = validRange(range) ? minVersion(range) : null;

  return lowest ? lowest.major : null;
};

/**
 * The major versions of Astro the project and its workspaces depend on.
 * Best-effort, like detectFrameworks: returns what it can read.
 */
export const detectAstroMajorVersions = async (): Promise<number[]> => {
  const packages: { dir: string; pkg: DependencyFields | undefined }[] = [
    { dir: process.cwd(), pkg: await readPackageJson() },
  ];

  try {
    for (const workspace of findWorkspaces() ?? []) {
      packages.push({ dir: workspace.location, pkg: workspace.package });
    }
  } catch {
    // best-effort — use the root package alone
  }

  const versions = new Set<number>();

  for (const { dir, pkg } of packages) {
    const range = declaredAstroRange(pkg);
    const version = range ? astroMajorVersion(dir, range) : null;

    if (version !== null) {
      versions.add(version);
    }
  }

  return [...versions];
};
