import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { intro, log, outro, spinner } from "@clack/prompts";
import { parse } from "jsonc-parser";

import packageJson from "../../package.json" with { type: "json" };
import { canResolveUltracite } from "../config-resolution";
import { runCommandSync } from "../run-command";
import { readPackageJsonSync } from "../schemas";
import {
  biomeConfigNames,
  detectLinter,
  eslintConfigNames,
  prettierConfigNames,
  stylelintConfigNames,
} from "../utils";
import type { Linter } from "../utils";

interface DiagnosticCheck {
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

// ---------------------------------------------------------------------------
// Installation checks
// ---------------------------------------------------------------------------

const checkToolInstallation = (
  tool: string,
  required: boolean
): DiagnosticCheck => {
  const result = runCommandSync(tool, ["--version"], { encoding: "utf-8" });

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

// ---------------------------------------------------------------------------
// Config checks
// ---------------------------------------------------------------------------

const checkBiomeConfig = (): DiagnosticCheck => {
  let configPath: string | null = null;
  let biomeConfigFile: string | null = null;

  for (const fileName of biomeConfigNames) {
    const fullPath = path.join(process.cwd(), fileName);
    if (existsSync(fullPath)) {
      configPath = fullPath;
      biomeConfigFile = fileName;
      break;
    }
  }

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
  let configPath: string | null = null;
  for (const eslintPath of eslintConfigNames) {
    const fullPath = path.join(process.cwd(), eslintPath);
    if (existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

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

const checkPrettierConfig = (): DiagnosticCheck => {
  for (const prettierPath of prettierConfigNames) {
    if (existsSync(path.join(process.cwd(), prettierPath))) {
      return {
        message: `Prettier configuration found (${prettierPath})`,
        name: PRETTIER_CHECK,
        status: "pass",
      };
    }
  }

  return {
    message: "No Prettier configuration found",
    name: PRETTIER_CHECK,
    status: "fail",
  };
};

const checkStylelintConfig = (): DiagnosticCheck => {
  for (const stylelintPath of stylelintConfigNames) {
    if (existsSync(path.join(process.cwd(), stylelintPath))) {
      return {
        message: `Stylelint configuration found (${stylelintPath})`,
        name: STYLELINT_CHECK,
        status: "pass",
      };
    }
  }

  return {
    message: "No Stylelint configuration found",
    name: STYLELINT_CHECK,
    status: "warn",
  };
};

const checkOxlintConfig = (): DiagnosticCheck => {
  const oxlintConfigPath = path.join(process.cwd(), "oxlint.config.ts");

  if (!existsSync(oxlintConfigPath)) {
    return {
      message: "No oxlint.config.ts file found",
      name: OXLINT_CHECK,
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(oxlintConfigPath, "utf-8");

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
  const oxfmtConfigPath = path.join(process.cwd(), "oxfmt.config.ts");

  if (!existsSync(oxfmtConfigPath)) {
    return {
      message: "No oxfmt.config.ts file found",
      name: OXFMT_CHECK,
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(oxfmtConfigPath, "utf-8");

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
  if (linter !== "eslint") {
    const prettierConfigFiles = [
      ".prettierrc",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.mjs",
      ".prettierrc.json",
      ".prettierrc.yaml",
      ".prettierrc.yml",
      "prettier.config.js",
      "prettier.config.mjs",
      "prettier.config.cjs",
    ];

    if (
      prettierConfigFiles.some((file) =>
        existsSync(path.join(process.cwd(), file))
      )
    ) {
      conflicts.push("Prettier");
    }
  }

  // Check for old ESLint config files (legacy .eslintrc format)
  const legacyEslintConfigs = [
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.mjs",
    ".eslintrc.json",
    ".eslintrc.yaml",
    ".eslintrc.yml",
  ];

  if (
    legacyEslintConfigs.some((file) =>
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

const getChecksForLinter = (
  linter: Linter
): { fn: () => DiagnosticCheck; name: string }[] => {
  const checks: { fn: () => DiagnosticCheck; name: string }[] = [];

  switch (linter) {
    case "biome": {
      checks.push(
        {
          fn: () => checkToolInstallation("biome", true),
          name: "Biome installation",
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
        { fn: checkEslintConfig, name: ESLINT_CHECK },
        {
          fn: () => checkToolInstallation("prettier", true),
          name: "Prettier installation",
        },
        { fn: checkPrettierConfig, name: PRETTIER_CHECK },
        {
          fn: () => checkToolInstallation("stylelint", false),
          name: "Stylelint installation",
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
        { fn: checkOxlintConfig, name: OXLINT_CHECK },
        {
          fn: () => checkToolInstallation("oxfmt", true),
          name: "oxfmt installation",
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

export const doctor = (): void => {
  intro(`Ultracite v${packageJson.version} Doctor`);

  const linter = detectLinter();

  if (!linter) {
    log.error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
    outro(DOCTOR_COMPLETE);
    throw new Error("Doctor checks failed");
  }

  log.info(`Detected linter: ${linter}`);

  const s = spinner();
  s.start("Running diagnostics...");

  const checksToRun = getChecksForLinter(linter);
  const checks: DiagnosticCheck[] = checksToRun.map(({ fn }) => fn());

  s.stop("Diagnostics complete.");

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

  if (failCount > 0) {
    log.error("Some checks failed. Run 'ultracite init' to fix issues.");
    outro(DOCTOR_COMPLETE);
    throw new Error("Doctor checks failed");
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
