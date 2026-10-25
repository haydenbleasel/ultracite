import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { intro, log, outro, spinner } from "@clack/prompts";
import { addDevDependency, detectPackageManager } from "nypm";
import type { PackageManager } from "nypm";

import packageJson from "../../package.json" with { type: "json" };
import { agentAdapters, assertAgentAvailable } from "../agent-fix/agents";
import {
  findInstalledPackage,
  UltraciteSetupError,
} from "../config-resolution";
import type { InstalledPackage } from "../config-resolution";
import {
  biomeVersion,
  eslintCoreDevDependencies,
  eslintFrameworkDevDependencies,
  eslintPeerOverridesFor,
  OXLINT_JS_PLUGIN_DEV_DEPENDENCIES,
  OXLINT_TOOLCHAIN_DEV_DEPENDENCIES,
  oxfmtFrameworkDevDependencies,
} from "../dependencies";
import type { FixAgent } from "../linter-args";
import {
  getRootInstallOptions,
  installFailedError,
  normalizePackageManager,
  resolveRequestedPackageManager,
} from "../package-manager";
import { readPackageJson } from "../schemas";
import { spawnSync } from "../spawn-sync";
import { migrateWithAgent } from "../upgrade-agent";
import { findPendingGuides } from "../upgrade-guides";
import type { UpgradeGuide } from "../upgrade-guides";
import {
  addEslintPeerOverrides,
  detectLinter,
  eslintConfigNames,
  exists,
  findNearestFile,
} from "../utils";
import type { Linter } from "../utils";
import { DOCTOR_FAILED, reportDiagnostics, runDiagnostics } from "./doctor";

const PACKAGE_NAME = "ultracite";
const REPOSITORY_URL = "https://github.com/haydenbleasel/ultracite";
const RELEASES_URL = `${REPOSITORY_URL}/releases`;
const UPGRADE_COMPLETE = "Upgrade complete";

export interface UpgradeOptions {
  /** The coding agent to apply the upgrade guides with, if any. */
  agent?: FixAgent;
  pm?: string;
  /**
   * Sync the toolchain against this CLI's pins without touching the
   * `ultracite` package itself. Set by the hand-off below, when a freshly
   * installed CLI is re-invoked to finish the upgrade with its own pins.
   */
  skipSelf?: boolean;
  /**
   * The release to upgrade to: `latest` (the default), a dist-tag, or a
   * version or major such as `7` or `7.12.4`.
   */
  version?: string;
}

// A dist-tag or a (partial) version, which is all `ultracite@<spec>` takes
// here; anything else could reach the package manager as another argument.
const VERSION_SPEC_RE =
  /^(?:[a-z][a-z0-9-]*|\d+(?:\.\d+){0,2}(?:-[0-9a-z.-]+)?)$/iu;

const assertVersionSpec = (version: string): void => {
  if (!VERSION_SPEC_RE.test(version)) {
    throw new UltraciteSetupError(
      `\`${version}\` isn't a version. Pass a release such as \`--version 7\` or \`--version 7.12.4\`, or a dist-tag such as \`latest\`.`
    );
  }
};

// The first major whose `upgrade` takes --claude and --codex. The hand-off
// passes the flag on to the release it installs, and older ones reject it.
const FIRST_AGENT_UPGRADE_MAJOR = 8;
const VERSION_MAJOR_RE = /^(?<major>\d+)/u;

const assertAgentUpgradeSupported = (
  version: string,
  agent: FixAgent | undefined
): void => {
  const major = VERSION_MAJOR_RE.exec(version)?.groups?.major;

  if (agent && major && Number(major) < FIRST_AGENT_UPGRADE_MAJOR) {
    throw new UltraciteSetupError(
      `\`--${agent}\` needs Ultracite ${FIRST_AGENT_UPGRADE_MAJOR} or later, since earlier releases can't hand the upgrade to an agent. Drop \`--${agent}\` to install ${version}, or upgrade to ${FIRST_AGENT_UPGRADE_MAJOR} or later.`
    );
  }
};

type InstallOptions = Parameters<typeof addDevDependency>[1];

type Spinner = ReturnType<typeof spinner>;

/** Installs the packages, stopping the spinner and explaining a failure. */
const installPackages = async (
  packages: string[],
  installOptions: InstallOptions,
  packageManager: PackageManager,
  s: Spinner
): Promise<void> => {
  try {
    await addDevDependency(packages, installOptions);
  } catch (error) {
    s.error("Install failed.");
    throw installFailedError(
      error instanceof Error ? error.message : String(error),
      packageManager,
      "ultracite upgrade"
    );
  }
};

const resolvePackageManager = async (
  requested?: string
): Promise<PackageManager> => {
  if (requested) {
    return await resolveRequestedPackageManager(requested);
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

  log.info(`Using ${detected.name} (detected from the project)`);

  return normalizePackageManager(detected);
};

const collectProjectDependencyNames = async (): Promise<Set<string>> => {
  const pkg = await readPackageJson();

  return new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
  ]);
};

const ESLINT_PRESET_RE = /ultracite\/eslint\/(?<preset>[a-z-]+)/gu;

/**
 * The framework presets the project's ESLint config imports. Their plugins are
 * reinstalled even when package.json lacks them, so a preset that gained a
 * plugin in a newer release (e.g. nestjs) gets it on upgrade.
 */
export const getConfiguredEslintFrameworks = (): Set<string> => {
  const found = findNearestFile(eslintConfigNames);

  if (!found) {
    return new Set();
  }

  try {
    const content = readFileSync(found.path, "utf-8");

    return new Set(
      [...content.matchAll(ESLINT_PRESET_RE)].map(
        (match) => match.groups?.preset ?? ""
      )
    );
  } catch {
    return new Set();
  }
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
  projectDependencies: ReadonlySet<string>,
  configuredFrameworks: ReadonlySet<string> = new Set()
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

      for (const [framework, dependencies] of Object.entries(
        eslintFrameworkDevDependencies
      )) {
        const configured = configuredFrameworks.has(framework);

        for (const [name, version] of Object.entries(dependencies)) {
          if (configured || projectDependencies.has(name)) {
            packages.set(name, version);
          }
        }
      }

      break;
    }

    case "oxlint": {
      // Mirrors init: the ranges this release was verified against.
      packages.set("oxlint", OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxlint);
      packages.set("oxfmt", OXLINT_TOOLCHAIN_DEV_DEPENDENCIES.oxfmt);

      if (projectDependencies.has("oxlint-tsgolint")) {
        packages.set(
          "oxlint-tsgolint",
          OXLINT_TOOLCHAIN_DEV_DEPENDENCIES["oxlint-tsgolint"]
        );
      }

      for (const [name, version] of [
        ...Object.entries(OXLINT_JS_PLUGIN_DEV_DEPENDENCIES),
        ...Object.values(oxfmtFrameworkDevDependencies).flatMap(
          (dependencies) => Object.entries(dependencies ?? {})
        ),
      ]) {
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
 * Install the requested Ultracite release. Returns the installed package when
 * a different CLI than the running one landed, so the caller can hand off to
 * it.
 */
const updateSelf = async (
  installOptions: InstallOptions,
  packageManager: PackageManager,
  version: string
): Promise<InstalledPackage | null> => {
  const previous = findInstalledPackage(PACKAGE_NAME)?.manifest.version;

  const s = spinner();
  s.start(
    version === "latest"
      ? "Updating Ultracite to the latest release..."
      : `Updating Ultracite to ${version}...`
  );
  await installPackages(
    [`${PACKAGE_NAME}@${version}`],
    installOptions,
    packageManager,
    s
  );

  const installed = findInstalledPackage(PACKAGE_NAME);
  const current = installed?.manifest.version;

  if (!current) {
    s.stop("Ultracite updated.");

    return null;
  }

  if (previous === current) {
    s.stop(`Ultracite is already on ${current}.`);
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
  requestedPackageManager: string | undefined,
  agent: FixAgent | undefined
): number | null => {
  const bin = resolveInstalledBin(installed);

  if (!bin) {
    return null;
  }

  log.info(
    `Handing off to Ultracite ${installed.manifest.version} to sync the toolchain...`
  );

  // Forward --pm only when the user passed it. Otherwise the new CLI
  // detects the package manager itself, with the details (like the Yarn
  // major version) a bare name would lose.
  const result = spawnSync(
    process.execPath,
    [
      bin,
      "upgrade",
      "--skip-self",
      ...(requestedPackageManager ? ["--pm", requestedPackageManager] : []),
      ...(agent ? [`--${agent}`] : []),
    ],
    { stdio: "inherit" }
  );

  if (result.error) {
    log.warn(`Could not run the installed Ultracite: ${result.error.message}`);

    return null;
  }

  // The hand-off printed its own diagnostics; just carry its exit code.
  return result.status ?? 1;
};

// npm rejects ESLint plugins whose peer range hasn't caught up with ESLint
// 10, and it checks the whole tree on every install, so the project
// overrides their peer before anything is installed.
const overrideEslintPeers = async (
  packageManager: PackageManager,
  specs: Iterable<string>
): Promise<void> => {
  if (packageManager.name === "npm") {
    await addEslintPeerOverrides(eslintPeerOverridesFor([...specs]));
  }
};

const syncToolchain = async (
  linter: Linter,
  installOptions: InstallOptions,
  packageManager: PackageManager
): Promise<void> => {
  const packages = getToolchainPackages(
    linter,
    await collectProjectDependencyNames(),
    linter === "eslint" ? getConfiguredEslintFrameworks() : new Set()
  );

  await overrideEslintPeers(packageManager, packages);

  const s = spinner();
  s.start(
    `Syncing the ${linter} toolchain with Ultracite ${packageJson.version}...`
  );
  await installPackages(packages, installOptions, packageManager, s);
  s.stop(`Installed ${packages.join(", ")}`);
};

/** Where to read a guide: the copy the installed package ships, or GitHub. */
const guideLocation = (guide: UpgradeGuide): string => {
  const installed = findInstalledPackage(PACKAGE_NAME);
  const local = installed ? path.join(installed.dir, guide.path) : null;

  return local && exists(local)
    ? path.relative(process.cwd(), local)
    : `${REPOSITORY_URL}/blob/main/${guide.path}`;
};

const listGuides = (guides: UpgradeGuide[]): string =>
  guides
    .map((guide) => `v${guide.version}: ${guideLocation(guide)}`)
    .join("\n");

/**
 * Brings the project's configuration up to this release's format with the
 * upgrade guides it still needs, through the coding agent when one was
 * passed. Resolves false when an agent was asked to and changes remain.
 */
const updateConfiguration = async (
  linter: Linter,
  agent: FixAgent | undefined
): Promise<boolean> => {
  const pending = findPendingGuides();

  if (pending.length === 0) {
    log.info(
      "Configuration files are already in this release's format. If the release notes mention preset changes, re-run `ultracite init` to regenerate them."
    );

    return true;
  }

  if (!agent) {
    log.warn(
      `This project's configuration predates Ultracite v${pending.at(-1)?.version}. Run \`ultracite upgrade --claude\` or \`--codex\` to have that agent update it, or follow the guides:\n${listGuides(pending)}`
    );

    return true;
  }

  const { failure, remaining } = await migrateWithAgent(agent, {
    guides: pending,
    linter,
    version: packageJson.version,
  });

  if (remaining.length > 0) {
    log.warn(
      `${failure ?? "Some changes are still missing."} Finish them by following:\n${listGuides(remaining)}`
    );

    return false;
  }

  return true;
};

/** Runs the upgrade and resolves with the process exit code to use. */
export const upgrade = async (
  options: UpgradeOptions = {}
): Promise<number> => {
  intro(`Ultracite v${packageJson.version} Upgrade`);

  const version = options.version ?? "latest";
  assertVersionSpec(version);
  assertAgentUpgradeSupported(version, options.agent);

  const linter = detectLinter();

  if (!linter) {
    throw new UltraciteSetupError(
      "No linter configuration found. Run `ultracite init` to set up a linter before upgrading."
    );
  }

  log.info(`Detected linter: ${linter}`);

  // Fail before installing anything rather than after.
  if (options.agent) {
    assertAgentAvailable(agentAdapters[options.agent]);
  }

  const packageManager = await resolvePackageManager(options.pm);

  const installOptions: InstallOptions = {
    corepack: false,
    silent: true,
    ...getRootInstallOptions(packageManager),
  };

  if (linter === "eslint") {
    await overrideEslintPeers(
      packageManager,
      await collectProjectDependencyNames()
    );
  }

  if (!options.skipSelf) {
    const newer = await updateSelf(installOptions, packageManager, version);

    const handOffStatus = newer
      ? handOffToInstalled(newer, options.pm, options.agent)
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

  await syncToolchain(linter, installOptions, packageManager);

  const configurationUpdated = await updateConfiguration(linter, options.agent);

  const { failCount } = reportDiagnostics(runDiagnostics(linter));

  if (failCount > 0) {
    log.error("Some checks still fail. Run `ultracite doctor` for details.");
  }

  // Either way the process exits non-zero, with the reason already logged.
  if (failCount > 0 || !configurationUpdated) {
    outro(UPGRADE_COMPLETE);
    throw new Error(DOCTOR_FAILED);
  }

  outro(UPGRADE_COMPLETE);

  return 0;
};
