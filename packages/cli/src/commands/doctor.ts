import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { intro, log, outro, spinner } from "@clack/prompts";
import { parse } from "jsonc-parser";

import packageJson from "../../package.json" with { type: "json" };
import { runCommandSync } from "../run-command";

// Config files to check for conflicting tools
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

const eslintConfigFiles = [
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.mjs",
  ".eslintrc.json",
  ".eslintrc.yaml",
  ".eslintrc.yml",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
];

interface DiagnosticCheck {
  message: string;
  name: string;
  status: "pass" | "fail" | "warn";
}

// Check if Biome is installed
const checkBiomeInstallation = (): DiagnosticCheck => {
  const biomeCheck = runCommandSync("biome", ["--version"], {
    encoding: "utf-8",
  });

  if (biomeCheck.status === 0 && biomeCheck.stdout) {
    return {
      message: `Biome is installed (${String(biomeCheck.stdout).trim()})`,
      name: "Biome installation",
      status: "pass",
    };
  }

  return {
    message: "Biome is not installed or not accessible",
    name: "Biome installation",
    status: "fail",
  };
};

// Check if ESLint is installed
const checkEslintInstallation = (): DiagnosticCheck => {
  const eslintCheck = runCommandSync("eslint", ["--version"], {
    encoding: "utf-8",
  });

  if (eslintCheck.status === 0 && eslintCheck.stdout) {
    return {
      message: `ESLint is installed (${String(eslintCheck.stdout).trim()})`,
      name: "ESLint installation",
      status: "pass",
    };
  }

  return {
    message: "ESLint is not installed (optional)",
    name: "ESLint installation",
    status: "warn",
  };
};

// Check if Oxlint is installed
const checkOxlintInstallation = (): DiagnosticCheck => {
  const oxlintCheck = runCommandSync("oxlint", ["--version"], {
    encoding: "utf-8",
  });

  if (oxlintCheck.status === 0 && oxlintCheck.stdout) {
    return {
      message: `Oxlint is installed (${String(oxlintCheck.stdout).trim()})`,
      name: "Oxlint installation",
      status: "pass",
    };
  }

  return {
    message: "Oxlint is not installed (optional)",
    name: "Oxlint installation",
    status: "warn",
  };
};

// Check if biome.json exists and extends ultracite
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
      status: "warn",
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

// Check if eslint.config.* exists and uses ultracite
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
      message: "No eslint.config.* file found (optional)",
      name: "ESLint configuration",
      status: "warn",
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

// Helper to generate the module path for oxlint configs
const getOxlintConfigPath = (name: string) => `ultracite/oxlint/${name}`;

// Check if oxlint.config.ts exists and extends ultracite
const checkOxlintConfig = (): DiagnosticCheck => {
  const oxlintConfigPath = join(process.cwd(), "oxlint.config.ts");

  if (!existsSync(oxlintConfigPath)) {
    return {
      message: "No oxlint.config.ts file found (optional)",
      name: "Oxlint configuration",
      status: "warn",
    };
  }

  try {
    const configContent = readFileSync(oxlintConfigPath, "utf-8");

    if (configContent.includes(getOxlintConfigPath("core"))) {
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

// Check if Ultracite is in package.json
const checkUltraciteDependency = (): DiagnosticCheck => {
  const packageJsonPath = join(process.cwd(), "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      message: "No package.json found",
      name: "Ultracite dependency",
      status: "warn",
    };
  }

  try {
    const pkgJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
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
  } catch {
    return {
      message: "Could not parse package.json",
      name: "Ultracite dependency",
      status: "warn",
    };
  }
};

// Check for conflicting tools
const checkConflictingTools = (): DiagnosticCheck => {
  // Check for Prettier config files
  const hasPrettier = prettierConfigFiles.some((file) =>
    existsSync(join(process.cwd(), file))
  );

  // Check for old ESLint config files (not flat config)
  const oldEslintConfigs = eslintConfigFiles.filter(
    (file) => !file.startsWith("eslint.config")
  );
  const hasOldEslint = oldEslintConfigs.some((file) =>
    existsSync(join(process.cwd(), file))
  );

  if (hasPrettier || hasOldEslint) {
    const conflicts: string[] = [];
    if (hasPrettier) {
      conflicts.push("Prettier");
    }
    if (hasOldEslint) {
      conflicts.push("ESLint (legacy config)");
    }

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

// All check functions — run in order, all sync
const allChecks: { fn: () => DiagnosticCheck; name: string }[] = [
  { fn: checkBiomeInstallation, name: "Biome installation" },
  { fn: checkEslintInstallation, name: "ESLint installation" },
  { fn: checkOxlintInstallation, name: "Oxlint installation" },
  { fn: checkBiomeConfig, name: "Biome configuration" },
  { fn: checkEslintConfig, name: "ESLint configuration" },
  { fn: checkOxlintConfig, name: "Oxlint configuration" },
  { fn: checkUltraciteDependency, name: "Ultracite dependency" },
  { fn: checkConflictingTools, name: "conflicting tools" },
];

// Main doctor function
export const doctor = (): void => {
  intro(`Ultracite v${packageJson.version} Doctor`);

  const s = spinner();
  s.start("Running diagnostics...");

  const checks: DiagnosticCheck[] = allChecks.map(({ fn }) => fn());

  s.stop("Diagnostics complete.");

  // Log individual results
  for (const check of checks) {
    if (check.status === "pass") {
      log.success(check.message);
    } else if (check.status === "warn") {
      log.warn(check.message);
    } else {
      log.error(check.message);
    }
  }

  // Calculate summary
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
