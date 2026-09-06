import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { intro, log, outro, spinner } from "@clack/prompts";
import { parse } from "jsonc-parser";
import { gtr, satisfies, valid } from "semver";

import packageJson from "../../package.json" with { type: "json" };
import {
  canResolveUltracite,
  findInstalledPackage,
} from "../config-resolution";
import { toolchainPeerRanges } from "../dependencies";
import type { ToolchainPackageName } from "../dependencies";
import { readPackageJsonSync } from "../schemas";
import { spawnSync } from "../spawn-sync";
import {
  biomeConfigNames,
  detectLinter,
  eslintConfigNames,
  findNearestFile,
  legacyEslintConfigNames,
  oxfmtConfigNames,
  oxlintConfigNames,
  prettierConfigNames,
  stylelintConfigNames,
} from "../utils";
import type { Linter } from "../utils";

export interface DiagnosticCheck {
  message: string;
  name: string;
  status: "fail" | "pass" | "warn";
}

// Check names, each reused across a check's pass/warn/fail branches.
const BIOME_CHECK = "Biome configuration";
const ESLINT_CHECK = "ESLint configuration";
const PRETTIER_CHECK = "Prettier configuration";
const STYLELINT_CHECK = "Stylelint configuration";
const OXLINT_CHECK = "Oxlint configuration";
const OXFMT_CHECK = "oxfmt configuration";
const ULTRACITE_DEP_CHECK = "Ultracite dependency";
const CONFLICTING_TOOLS_CHECK = "Conflicting tools";
const DOCTOR_COMPLETE = "Doctor complete";
export const DOCTOR_FAILED = "Doctor checks failed";

// ---------------------------------------------------------------------------
// Installation checks
// ---------------------------------------------------------------------------

const checkToolInstallation = (
  tool: string,
  required: boolean
): DiagnosticCheck => {
  const result = spawnSync(tool, ["--version"]);

  if (result.status === 0 && result.stdout) {
    return {
      message: `${tool} is installed (${String(result.stdout).trim()})`,
      name: `${tool} installation`,
      status: "pass",
    };
  }

  return {
    message: `${tool} is not installed${required ? "" : " (optional)"}`,
    name: `${tool} installation`,
    status: required ? "fail" : "warn",
  };
};

/**
 * Compare the tool installed in the project against the range this Ultracite
 * release was verified with (its optional peer dependency). Presets reference
 * rule keys by name, so a tool that's too old rejects the config outright —
 * the "Found an unknown key" crash — which is exactly what this catches before
 * `check`/`fix` run into it.
 */
const checkToolVersion = (
  packageName: ToolchainPackageName,
  required: boolean
): DiagnosticCheck | null => {
  const range = toolchainPeerRanges[packageName];
  const name = `${packageName} version`;
  const version = findInstalledPackage(packageName)?.manifest.version;

  if (!version) {
    // Optional tools that aren't installed are already reported by the
    // installation check; there's no version to compare.
    if (!required) {
      return null;
    }

    return {
      message: `Could not determine the installed ${packageName} version — install it in this project so Ultracite can verify it satisfies ${range}`,
      name,
      status: "warn",
    };
  }

  if (!valid(version)) {
    return {
      message: `${packageName} reports an unrecognised version (${version}); Ultracite ${packageJson.version} was verified against ${range}`,
      name,
      status: "warn",
    };
  }

  if (satisfies(version, range, { includePrerelease: true })) {
    return {
      message: `${packageName} ${version} satisfies ${range}`,
      name,
      status: "pass",
    };
  }

  if (gtr(version, range, { includePrerelease: true })) {
    return {
      message: `${packageName} ${version} is newer than Ultracite ${packageJson.version} supports (${range}) — update Ultracite once a release supports it`,
      name,
      status: "warn",
    };
  }

  return {
    message: `${packageName} ${version} is older than Ultracite ${packageJson.version} requires (${range}) — run \`ultracite upgrade\``,
    name,
    status: "fail",
  };
};

// ---------------------------------------------------------------------------
// Config checks
// ---------------------------------------------------------------------------

const checkBiomeConfig = (): DiagnosticCheck => {
  // Walk up like detectLinter (and Biome itself) so monorepo packages that
  // inherit a root config don't fail the check.
  const found = findNearestFile(biomeConfigNames);
  const configPath = found?.path ?? null;
  const biomeConfigFile = found?.fileName ?? null;

  if (!configPath) {
    return {
      message: `No Biome config file found (expected one of: ${biomeConfigNames.join(", ")})`,
      name: BIOME_CHECK,
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(configPath, "utf-8");
    const config = parse(configContent);

    if (
      Array.isArray(config?.extends) &&
      config.extends.includes("ultracite/biome/core")
    ) {
      return {
        message: `${biomeConfigFile} extends ultracite/biome/core`,
        name: BIOME_CHECK,
        status: "pass",
      };
    }

    return {
      message: `${biomeConfigFile} exists but doesn't extend ultracite/biome/core`,
      name: BIOME_CHECK,
      status: "warn",
    };
  } catch {
    return {
      message: `Could not parse ${biomeConfigFile} file`,
      name: BIOME_CHECK,
      status: "fail",
    };
  }
};

const checkEslintConfig = (): DiagnosticCheck => {
  const configPath = findNearestFile(eslintConfigNames)?.path ?? null;

  if (!configPath) {
    return {
      message: "No eslint.config.* file found",
      name: ESLINT_CHECK,
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(configPath, "utf-8");

    if (configContent.includes("ultracite/eslint")) {
      return {
        message: "eslint.config.* imports ultracite/eslint",
        name: ESLINT_CHECK,
        status: "pass",
      };
    }

    return {
      message: "eslint.config.* exists but doesn't import ultracite/eslint",
      name: ESLINT_CHECK,
      status: "warn",
    };
  } catch {
    return {
      message: "Could not read eslint.config.* file",
      name: ESLINT_CHECK,
      status: "fail",
    };
  }
};

// The Prettier/Stylelint writers treat a matching package.json key as a
// valid existing config, so doctor must too.
const hasPackageJsonKey = (key: "prettier" | "stylelint"): boolean => {
  const pkgJson = readPackageJsonSync(path.join(process.cwd(), "package.json"));
  return pkgJson?.[key] !== undefined;
};

const checkPrettierConfig = (): DiagnosticCheck => {
  if (hasPackageJsonKey("prettier")) {
    return {
      message: "Prettier configuration found (package.json)",
      name: PRETTIER_CHECK,
      status: "pass",
    };
  }

  const found = findNearestFile(prettierConfigNames);
  if (found) {
    return {
      message: `Prettier configuration found (${found.fileName})`,
      name: PRETTIER_CHECK,
      status: "pass",
    };
  }

  return {
    message: "No Prettier configuration found",
    name: PRETTIER_CHECK,
    status: "fail",
  };
};

const checkStylelintConfig = (): DiagnosticCheck => {
  if (hasPackageJsonKey("stylelint")) {
    return {
      message: "Stylelint configuration found (package.json)",
      name: STYLELINT_CHECK,
      status: "pass",
    };
  }

  const found = findNearestFile(stylelintConfigNames);
  if (found) {
    return {
      message: `Stylelint configuration found (${found.fileName})`,
      name: STYLELINT_CHECK,
      status: "pass",
    };
  }

  return {
    message: "No Stylelint configuration found",
    name: STYLELINT_CHECK,
    status: "warn",
  };
};

const checkOxlintConfig = (): DiagnosticCheck => {
  const found = findNearestFile(oxlintConfigNames);

  if (!found) {
    return {
      message: `No oxlint config file found (expected one of: ${oxlintConfigNames.join(", ")})`,
      name: OXLINT_CHECK,
      status: "fail",
    };
  }

  // detectLinter accepts .oxlintrc.json, so its presence must not hard-fail —
  // but the ultracite setup uses oxlint.config.ts, so suggest migrating.
  if (found.fileName !== "oxlint.config.ts") {
    return {
      message: `${found.fileName} found — run \`ultracite init\` to migrate to oxlint.config.ts`,
      name: OXLINT_CHECK,
      status: "warn",
    };
  }

  try {
    const configContent = readFileSync(found.path, "utf-8");

    if (configContent.includes("ultracite/oxlint/")) {
      return {
        message: "oxlint.config.ts extends ultracite oxlint config",
        name: OXLINT_CHECK,
        status: "pass",
      };
    }

    return {
      message: "oxlint.config.ts exists but doesn't extend ultracite config",
      name: OXLINT_CHECK,
      status: "warn",
    };
  } catch {
    return {
      message: "Could not read oxlint.config.ts file",
      name: OXLINT_CHECK,
      status: "fail",
    };
  }
};

const checkOxfmtConfig = (): DiagnosticCheck => {
  const found = findNearestFile(oxfmtConfigNames);

  if (!found) {
    return {
      message: "No oxfmt.config.ts file found",
      name: OXFMT_CHECK,
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(found.path, "utf-8");

    if (configContent.includes("ultracite/oxfmt")) {
      return {
        message: "oxfmt.config.ts extends ultracite oxfmt config",
        name: OXFMT_CHECK,
        status: "pass",
      };
    }

    return {
      message: "oxfmt.config.ts exists but doesn't extend ultracite config",
      name: OXFMT_CHECK,
      status: "warn",
    };
  } catch {
    return {
      message: "Could not read oxfmt.config.ts file",
      name: OXFMT_CHECK,
      status: "fail",
    };
  }
};

// ---------------------------------------------------------------------------
// Shared checks
// ---------------------------------------------------------------------------

const checkUltraciteDependency = (linter: Linter): DiagnosticCheck => {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      message: "No package.json found",
      name: ULTRACITE_DEP_CHECK,
      status: "warn",
    };
  }

  const pkgJson = readPackageJsonSync(packageJsonPath);

  if (!pkgJson) {
    return {
      message: "Could not parse package.json",
      name: ULTRACITE_DEP_CHECK,
      status: "warn",
    };
  }

  const version =
    pkgJson.dependencies?.ultracite ||
    pkgJson.devDependencies?.ultracite ||
    pkgJson.peerDependencies?.ultracite;

  // Being listed in package.json isn't enough: the generated configs are
  // resolved out of the project's node_modules by Biome/ESLint/Oxlint
  // themselves, so an uninstalled dependency fails there with an opaque error.
  if (!canResolveUltracite(linter)) {
    return {
      message: version
        ? `Ultracite is in package.json (${version}) but isn't installed — run your package manager's install`
        : "Ultracite is not installed in this project — install it as a dev dependency",
      name: ULTRACITE_DEP_CHECK,
      status: "fail",
    };
  }

  if (version) {
    return {
      message: `Ultracite is installed (${version})`,
      name: ULTRACITE_DEP_CHECK,
      status: "pass",
    };
  }

  return {
    message: "Ultracite not found in package.json dependencies",
    name: ULTRACITE_DEP_CHECK,
    status: "warn",
  };
};

const checkConflictingTools = (linter: Linter): DiagnosticCheck => {
  const conflicts: string[] = [];

  // Only warn about Prettier if NOT using ESLint (ESLint setup includes Prettier)
  if (
    linter !== "eslint" &&
    prettierConfigNames.some((file) =>
      existsSync(path.join(process.cwd(), file))
    )
  ) {
    conflicts.push("Prettier");
  }

  // Check for old ESLint config files (legacy .eslintrc format)
  if (
    legacyEslintConfigNames.some((file) =>
      existsSync(path.join(process.cwd(), file))
    )
  ) {
    conflicts.push("ESLint (legacy config)");
  }

  if (conflicts.length > 0) {
    return {
      message: `Found potentially conflicting tools: ${conflicts.join(", ")}`,
      name: CONFLICTING_TOOLS_CHECK,
      status: "warn",
    };
  }

  return {
    message: "No conflicting formatting/linting tools found",
    name: CONFLICTING_TOOLS_CHECK,
    status: "pass",
  };
};

// ---------------------------------------------------------------------------
// Build linter-specific check list
// ---------------------------------------------------------------------------

interface CheckEntry {
  // null means the check doesn't apply to this project and is skipped.
  fn: () => DiagnosticCheck | null;
  name: string;
}

const getChecksForLinter = (linter: Linter): CheckEntry[] => {
  const checks: CheckEntry[] = [];

  switch (linter) {
    case "biome": {
      checks.push(
        {
          fn: () => checkToolInstallation("biome", true),
          name: "Biome installation",
        },
        {
          fn: () => checkToolVersion("@biomejs/biome", true),
          name: "Biome version",
        },
        { fn: checkBiomeConfig, name: BIOME_CHECK }
      );
      break;
    }
    case "eslint": {
      checks.push(
        {
          fn: () => checkToolInstallation("eslint", true),
          name: "ESLint installation",
        },
        {
          fn: () => checkToolVersion("eslint", true),
          name: "ESLint version",
        },
        { fn: checkEslintConfig, name: ESLINT_CHECK },
        {
          fn: () => checkToolInstallation("prettier", true),
          name: "Prettier installation",
        },
        {
          fn: () => checkToolVersion("prettier", true),
          name: "Prettier version",
        },
        { fn: checkPrettierConfig, name: PRETTIER_CHECK },
        {
          fn: () => checkToolInstallation("stylelint", false),
          name: "Stylelint installation",
        },
        {
          fn: () => checkToolVersion("stylelint", false),
          name: "Stylelint version",
        },
        { fn: checkStylelintConfig, name: STYLELINT_CHECK }
      );
      break;
    }
    case "oxlint": {
      checks.push(
        {
          fn: () => checkToolInstallation("oxlint", true),
          name: "Oxlint installation",
        },
        {
          fn: () => checkToolVersion("oxlint", true),
          name: "Oxlint version",
        },
        { fn: checkOxlintConfig, name: OXLINT_CHECK },
        {
          fn: () => checkToolInstallation("oxfmt", true),
          name: "oxfmt installation",
        },
        {
          fn: () => checkToolVersion("oxfmt", true),
          name: "oxfmt version",
        },
        { fn: checkOxfmtConfig, name: OXFMT_CHECK }
      );
      break;
    }
    default: {
      break;
    }
  }

  // Shared checks
  checks.push(
    { fn: () => checkUltraciteDependency(linter), name: ULTRACITE_DEP_CHECK },
    {
      fn: () => checkConflictingTools(linter),
      name: CONFLICTING_TOOLS_CHECK,
    }
  );

  return checks;
};

// ---------------------------------------------------------------------------
// Main doctor function
// ---------------------------------------------------------------------------

/**
 * Run every diagnostic that applies to the detected toolchain. Shared with
 * `ultracite upgrade`, which verifies the project the same way once the
 * dependencies are synced.
 */
export const runDiagnostics = (linter: Linter): DiagnosticCheck[] => {
  const checks: DiagnosticCheck[] = [];

  for (const { fn } of getChecksForLinter(linter)) {
    const check = fn();
    if (check) {
      checks.push(check);
    }
  }

  return checks;
};

export interface DiagnosticSummary {
  failCount: number;
  passCount: number;
  warnCount: number;
}

/** Print each check and its summary line; returns the counts for the caller. */
export const reportDiagnostics = (
  checks: DiagnosticCheck[]
): DiagnosticSummary => {
  for (const check of checks) {
    if (check.status === "pass") {
      log.success(check.message);
    } else if (check.status === "warn") {
      log.warn(check.message);
    } else {
      log.error(check.message);
    }
  }

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  log.info(
    `Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`
  );

  return { failCount, passCount, warnCount };
};

export const doctor = (): void => {
  intro(`Ultracite v${packageJson.version} Doctor`);

  const linter = detectLinter();

  if (!linter) {
    log.error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
    outro(DOCTOR_COMPLETE);
    throw new Error(DOCTOR_FAILED);
  }

  log.info(`Detected linter: ${linter}`);

  const s = spinner();
  s.start("Running diagnostics...");

  const checks = runDiagnostics(linter);

  s.stop("Diagnostics complete.");

  const { failCount, warnCount } = reportDiagnostics(checks);

  if (failCount > 0) {
    log.error(
      "Some checks failed. Run 'ultracite upgrade' for version mismatches or 'ultracite init' for configuration issues."
    );
    outro(DOCTOR_COMPLETE);
    throw new Error(DOCTOR_FAILED);
  }

  if (warnCount > 0) {
    log.warn(
      "Some optional improvements available. Run 'ultracite init' to configure."
    );
    outro(DOCTOR_COMPLETE);
    return;
  }

  log.success("Everything looks good!");
  outro(DOCTOR_COMPLETE);
};
