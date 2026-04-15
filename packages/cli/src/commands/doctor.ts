import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { intro, log, outro, spinner } from "@clack/prompts";
import { parse } from "jsonc-parser";

import packageJson from "../../package.json" with { type: "json" };
import { runCommandSync } from "../run-command";
import { readPackageJsonSync } from "../schemas";
import { detectLinter } from "../utils";
import type { Linter } from "../utils";

interface DiagnosticCheck {
  message: string;
  name: string;
  status: "fail" | "pass" | "warn";
}

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
  const biomeConfigPath = join(process.cwd(), "biome.json");
  const biomeJsoncPath = join(process.cwd(), "biome.jsonc");

  let configPath: string | null = null;
  if (existsSync(biomeConfigPath)) {
    configPath = biomeConfigPath;
  } else if (existsSync(biomeJsoncPath)) {
    configPath = biomeJsoncPath;
  }

  if (!configPath) {
    return {
      message: "No biome.json or biome.jsonc file found",
      name: "Biome configuration",
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
        message: "biome.json(c) extends ultracite/biome/core",
        name: "Biome configuration",
        status: "pass",
      };
    }

    return {
      message: "biome.json(c) exists but doesn't extend ultracite/biome/core",
      name: "Biome configuration",
      status: "warn",
    };
  } catch {
    return {
      message: "Could not parse biome.json(c) file",
      name: "Biome configuration",
      status: "fail",
    };
  }
};

const checkEslintConfig = (): DiagnosticCheck => {
  const eslintConfigPaths = [
    "eslint.config.mjs",
    "eslint.config.js",
    "eslint.config.cjs",
    "eslint.config.ts",
    "eslint.config.mts",
    "eslint.config.cts",
  ];

  let configPath: string | null = null;
  for (const path of eslintConfigPaths) {
    const fullPath = join(process.cwd(), path);
    if (existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (!configPath) {
    return {
      message: "No eslint.config.* file found",
      name: "ESLint configuration",
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(configPath, "utf-8");

    if (configContent.includes("ultracite/eslint")) {
      return {
        message: "eslint.config.* imports ultracite/eslint",
        name: "ESLint configuration",
        status: "pass",
      };
    }

    return {
      message: "eslint.config.* exists but doesn't import ultracite/eslint",
      name: "ESLint configuration",
      status: "warn",
    };
  } catch {
    return {
      message: "Could not read eslint.config.* file",
      name: "ESLint configuration",
      status: "fail",
    };
  }
};

const checkPrettierConfig = (): DiagnosticCheck => {
  const prettierConfigPaths = [
    "prettier.config.mjs",
    "prettier.config.js",
    "prettier.config.cjs",
    "prettier.config.ts",
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.mjs",
    ".prettierrc.cjs",
    ".prettierrc.js",
    ".prettierrc.yml",
    ".prettierrc.yaml",
  ];

  for (const path of prettierConfigPaths) {
    if (existsSync(join(process.cwd(), path))) {
      return {
        message: `Prettier configuration found (${path})`,
        name: "Prettier configuration",
        status: "pass",
      };
    }
  }

  return {
    message: "No Prettier configuration found",
    name: "Prettier configuration",
    status: "fail",
  };
};

const checkStylelintConfig = (): DiagnosticCheck => {
  const stylelintConfigPaths = [
    "stylelint.config.mjs",
    "stylelint.config.js",
    "stylelint.config.cjs",
    ".stylelintrc",
    ".stylelintrc.json",
    ".stylelintrc.mjs",
    ".stylelintrc.js",
    ".stylelintrc.yml",
    ".stylelintrc.yaml",
  ];

  for (const path of stylelintConfigPaths) {
    if (existsSync(join(process.cwd(), path))) {
      return {
        message: `Stylelint configuration found (${path})`,
        name: "Stylelint configuration",
        status: "pass",
      };
    }
  }

  return {
    message: "No Stylelint configuration found",
    name: "Stylelint configuration",
    status: "warn",
  };
};

const checkOxlintConfig = (): DiagnosticCheck => {
  const oxlintConfigPath = join(process.cwd(), "oxlint.config.ts");

  if (!existsSync(oxlintConfigPath)) {
    return {
      message: "No oxlint.config.ts file found",
      name: "Oxlint configuration",
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(oxlintConfigPath, "utf-8");

    if (configContent.includes("ultracite/oxlint/")) {
      return {
        message: "oxlint.config.ts extends ultracite oxlint config",
        name: "Oxlint configuration",
        status: "pass",
      };
    }

    return {
      message: "oxlint.config.ts exists but doesn't extend ultracite config",
      name: "Oxlint configuration",
      status: "warn",
    };
  } catch {
    return {
      message: "Could not read oxlint.config.ts file",
      name: "Oxlint configuration",
      status: "fail",
    };
  }
};

const checkOxfmtConfig = (): DiagnosticCheck => {
  const oxfmtConfigPath = join(process.cwd(), "oxfmt.config.ts");

  if (!existsSync(oxfmtConfigPath)) {
    return {
      message: "No oxfmt.config.ts file found",
      name: "oxfmt configuration",
      status: "fail",
    };
  }

  try {
    const configContent = readFileSync(oxfmtConfigPath, "utf-8");

    if (configContent.includes("ultracite/oxfmt")) {
      return {
        message: "oxfmt.config.ts extends ultracite oxfmt config",
        name: "oxfmt configuration",
        status: "pass",
      };
    }

    return {
      message: "oxfmt.config.ts exists but doesn't extend ultracite config",
      name: "oxfmt configuration",
      status: "warn",
    };
  } catch {
    return {
      message: "Could not read oxfmt.config.ts file",
      name: "oxfmt configuration",
      status: "fail",
    };
  }
};

// ---------------------------------------------------------------------------
// Shared checks
// ---------------------------------------------------------------------------

const checkUltraciteDependency = (): DiagnosticCheck => {
  const packageJsonPath = join(process.cwd(), "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      message: "No package.json found",
      name: "Ultracite dependency",
      status: "warn",
    };
  }

  const pkgJson = readPackageJsonSync(packageJsonPath);

  if (!pkgJson) {
    return {
      message: "Could not parse package.json",
      name: "Ultracite dependency",
      status: "warn",
    };
  }

  const version =
    pkgJson.dependencies?.ultracite ||
    pkgJson.devDependencies?.ultracite ||
    pkgJson.peerDependencies?.ultracite;

  if (version) {
    return {
      message: `Ultracite is in package.json (${version})`,
      name: "Ultracite dependency",
      status: "pass",
    };
  }

  return {
    message: "Ultracite not found in package.json dependencies",
    name: "Ultracite dependency",
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
      prettierConfigFiles.some((file) => existsSync(join(process.cwd(), file)))
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
    legacyEslintConfigs.some((file) => existsSync(join(process.cwd(), file)))
  ) {
    conflicts.push("ESLint (legacy config)");
  }

  if (conflicts.length > 0) {
    return {
      message: `Found potentially conflicting tools: ${conflicts.join(", ")}`,
      name: "Conflicting tools",
      status: "warn",
    };
  }

  return {
    message: "No conflicting formatting/linting tools found",
    name: "Conflicting tools",
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
        { fn: checkBiomeConfig, name: "Biome configuration" }
      );
      break;
    }
    case "eslint": {
      checks.push(
        {
          fn: () => checkToolInstallation("eslint", true),
          name: "ESLint installation",
        },
        { fn: checkEslintConfig, name: "ESLint configuration" },
        {
          fn: () => checkToolInstallation("prettier", true),
          name: "Prettier installation",
        },
        { fn: checkPrettierConfig, name: "Prettier configuration" },
        {
          fn: () => checkToolInstallation("stylelint", false),
          name: "Stylelint installation",
        },
        { fn: checkStylelintConfig, name: "Stylelint configuration" }
      );
      break;
    }
    case "oxlint": {
      checks.push(
        {
          fn: () => checkToolInstallation("oxlint", true),
          name: "Oxlint installation",
        },
        { fn: checkOxlintConfig, name: "Oxlint configuration" },
        {
          fn: () => checkToolInstallation("oxfmt", true),
          name: "oxfmt installation",
        },
        { fn: checkOxfmtConfig, name: "oxfmt configuration" }
      );
      break;
    }
    default: {
      break;
    }
  }

  // Shared checks
  checks.push(
    { fn: checkUltraciteDependency, name: "Ultracite dependency" },
    {
      fn: () => checkConflictingTools(linter),
      name: "Conflicting tools",
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
    outro("Doctor complete");
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
    outro("Doctor complete");
    throw new Error("Doctor checks failed");
  }

  if (warnCount > 0) {
    log.warn(
      "Some optional improvements available. Run 'ultracite init' to configure."
    );
    outro("Doctor complete");
    return;
  }

  log.success("Everything looks good!");
  outro("Doctor complete");
};
