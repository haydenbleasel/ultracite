import path from "node:path";
import process from "node:process";

import { intro, log, outro, spinner } from "@clack/prompts";
import { addDevDependency, detectPackageManager } from "nypm";
import type { PackageManager } from "nypm";

import packageJson from "../../package.json" with { type: "json" };
import {
  findInstalledPackage,
  UltraciteSetupError,
} from "../config-resolution";
import type { InstalledPackage } from "../config-resolution";
import {
  biomeVersion,
  eslintCoreDevDependencies,
  eslintFrameworkDevDependencies,
  OXLINT_JS_PLUGIN_DEV_DEPENDENCIES,
} from "../dependencies";
import {
  assertSupportedPackageManagerName,
  getRootInstallOptions,
  normalizePackageManager,
} from "../package-manager";
import { readPackageJson } from "../schemas";
import { spawnSync } from "../spawn-sync";
import { detectLinter, exists } from "../utils";
import type { Linter } from "../utils";
import { DOCTOR_FAILED, reportDiagnostics, runDiagnostics } from "./doctor";

const PACKAGE_NAME = "ultracite";
const REPOSITORY_URL = "https://github.com/haydenbleasel/ultracite";
const RELEASES_URL = `${REPOSITORY_URL}/releases`;
const UPGRADE_COMPLETE = "Upgrade complete";

export interface UpgradeOptions {
  pm?: string;
  /**
   * Sync the toolchain against this CLI's pins without touching the
   * `ultracite` package itself. Set by the hand-off below, when a freshly
   * installed CLI is re-invoked to finish the upgrade with its own pins.
   */
  skipSelf?: boolean;
}

type InstallOptions = Parameters<typeof addDevDependency>[1];

const resolvePackageManager = async (
  requested?: string
): Promise<PackageManager> => {
  if (requested) {
    const name = assertSupportedPackageManagerName(requested);
    return { command: name, name };
  }

  const detected = await detectPackageManager(process.cwd());

  if (!detected) {
    throw new UltraciteSetupError(
      "No package manager detected. Pass one with `--pm` (e.g. `ultracite upgrade --pm npm`)."
    );
  }

  for (const warning of detected.warnings ?? []) {
    log.warn(warning);
  }

  log.info(`Detected lockfile, using ${detected.name}`);
  return normalizePackageManager(detected);
};

const collectProjectDependencyNames = async (): Promise<Set<string>> => {
  const pkg = await readPackageJson();

  return new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
  ]);
};

/**
 * The `name@version` specs to (re)install for a toolchain: everything the
 * preset requires — including packages newer presets added — plus the
 * optional extras (framework plugins, JS plugins, type-aware support) the
 * project already uses, all at the versions this release pins. Extras the
 * project never opted into are left alone.
 */
export const getToolchainPackages = (
  linter: Linter,
  projectDependencies: ReadonlySet<string>
): string[] => {
  const packages = new Map<string, string>();

  switch (linter) {
    case "biome": {
      packages.set("@biomejs/biome", biomeVersion);
      break;
    }
    case "eslint": {
      for (const [name, version] of Object.entries(eslintCoreDevDependencies)) {
        packages.set(name, version);
      }
      for (const dependencies of Object.values(
        eslintFrameworkDevDependencies
      )) {
        for (const [name, version] of Object.entries(dependencies)) {
          if (projectDependencies.has(name)) {
            packages.set(name, version);
          }
        }
      }
      break;
    }
    case "oxlint": {
      // Mirrors init: oxlint and oxfmt track their latest release, while the
      // peer ranges guard against a preset/tool mismatch.
      packages.set("oxlint", "latest");
      packages.set("oxfmt", "latest");
      if (projectDependencies.has("oxlint-tsgolint")) {
        packages.set("oxlint-tsgolint", "latest");
      }
      for (const [name, version] of Object.entries(
        OXLINT_JS_PLUGIN_DEV_DEPENDENCIES
      )) {
        if (projectDependencies.has(name)) {
          packages.set(name, version);
        }
      }
      break;
    }
    default: {
      break;
    }
  }

  return [...packages].map(([name, version]) => `${name}@${version}`);
};

const resolveInstalledBin = (installed: InstalledPackage): string | null => {
  const relativeBin = installed.manifest.bin?.[PACKAGE_NAME];

  if (!relativeBin) {
    return null;
  }

  const binPath = path.join(installed.dir, relativeBin);
  return exists(binPath) ? binPath : null;
};

const compareUrl = (previous: string, current: string): string =>
  `${REPOSITORY_URL}/compare/${PACKAGE_NAME}@${previous}...${PACKAGE_NAME}@${current}`;

/**
 * Install the latest Ultracite. Returns the installed package when a newer
 * CLI than the running one landed, so the caller can hand off to it.
 */
const updateSelf = async (
  installOptions: InstallOptions
): Promise<InstalledPackage | null> => {
  const previous = findInstalledPackage(PACKAGE_NAME)?.manifest.version;

  const s = spinner();
  s.start("Updating Ultracite to the latest release...");
  await addDevDependency([`${PACKAGE_NAME}@latest`], installOptions);

  const installed = findInstalledPackage(PACKAGE_NAME);
  const current = installed?.manifest.version;

  if (!current) {
    s.stop("Ultracite updated.");
    return null;
  }

  if (previous === current) {
    s.stop(`Ultracite is already on the latest release (${current}).`);
  } else {
    s.stop(`Ultracite ${previous ?? "(not installed)"} → ${current}`);
    log.info(
      previous
        ? `Release notes: ${compareUrl(previous, current)}`
        : `Release notes: ${RELEASES_URL}`
    );
  }

  return installed && current !== packageJson.version ? installed : null;
};

/**
 * Re-invoke the freshly installed CLI so the toolchain is synced against the
 * pins that ship with *that* release rather than the ones baked into this
 * (older) copy. Returns its exit code, or null when it couldn't be run.
 */
const handOffToInstalled = (
  installed: InstalledPackage,
  packageManager: PackageManager
): number | null => {
  const bin = resolveInstalledBin(installed);

  if (!bin) {
    return null;
  }

  log.info(
    `Handing off to Ultracite ${installed.manifest.version} to sync the toolchain...`
  );

  const result = spawnSync(
    process.execPath,
    [bin, "upgrade", "--skip-self", "--pm", packageManager.name],
    { stdio: "inherit" }
  );

  if (result.error) {
    log.warn(`Could not run the installed Ultracite: ${result.error.message}`);
    return null;
  }

  // The hand-off printed its own diagnostics; just carry its exit code.
  return result.status ?? 1;
};

const syncToolchain = async (
  linter: Linter,
  installOptions: InstallOptions
): Promise<void> => {
  const packages = getToolchainPackages(
    linter,
    await collectProjectDependencyNames()
  );

  const s = spinner();
  s.start(
    `Syncing the ${linter} toolchain with Ultracite ${packageJson.version}...`
  );
  await addDevDependency(packages, installOptions);
  s.stop(`Installed ${packages.join(", ")}`);
};

/** Runs the upgrade and resolves with the process exit code to use. */
export const upgrade = async (
  options: UpgradeOptions = {}
): Promise<number> => {
  intro(`Ultracite v${packageJson.version} Upgrade`);

  const linter = detectLinter();

  if (!linter) {
    throw new UltraciteSetupError(
      "No linter configuration found. Run `ultracite init` to set up a linter before upgrading."
    );
  }

  log.info(`Detected linter: ${linter}`);

  const packageManager = await resolvePackageManager(options.pm);
  const installOptions: InstallOptions = {
    corepack: false,
    silent: true,
    ...getRootInstallOptions(packageManager),
  };

  if (!options.skipSelf) {
    const newer = await updateSelf(installOptions);
    const handOffStatus = newer
      ? handOffToInstalled(newer, packageManager)
      : null;

    if (handOffStatus !== null) {
      return handOffStatus;
    }

    if (newer) {
      log.warn(
        `Could not locate the installed Ultracite CLI; syncing with the pins from ${packageJson.version} instead. Re-run \`ultracite upgrade\` to finish.`
      );
    }
  }

  await syncToolchain(linter, installOptions);

  log.info(
    "Configuration files were left untouched. If the release notes mention preset changes, re-run `ultracite init` to regenerate them."
  );

  const { failCount } = reportDiagnostics(runDiagnostics(linter));

  if (failCount > 0) {
    log.error("Some checks still fail. Run `ultracite doctor` for details.");
    outro(UPGRADE_COMPLETE);
    throw new Error(DOCTOR_FAILED);
  }

  outro(UPGRADE_COMPLETE);
  return 0;
};
