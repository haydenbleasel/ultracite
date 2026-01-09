import { intro, log, outro, spinner } from "@clack/prompts";
import { parse } from "jsonc-parser";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";

import packageJson from "../../package.json" with { type: "json" };

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
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

// Check if Biome is installed
const checkBiomeInstallation = async (): Promise<DiagnosticCheck> => {
  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const command = dlxCommand(pm, "@biomejs/biome", {
    args: ["--version"],
    short: pm === "npm",
  });

  const biomeCheck = spawnSync(command, {
    encoding: "utf8",
    shell: true,
  });

  if (biomeCheck.status === 0 && biomeCheck.stdout) {
    return {
      message: `Biome is installed (${biomeCheck.stdout.trim()})`,
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
const checkEslintInstallation = async (): Promise<DiagnosticCheck> => {
  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const command = dlxCommand(pm, "eslint", {
    args: ["--version"],
    short: pm === "npm",
  });

  const eslintCheck = spawnSync(command, {
    encoding: "utf8",
    shell: true,
  });

  if (eslintCheck.status === 0 && eslintCheck.stdout) {
    return {
      message: `ESLint is installed (${eslintCheck.stdout.trim()})`,
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
const checkOxlintInstallation = async (): Promise<DiagnosticCheck> => {
  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const command = dlxCommand(pm, "oxlint", {
    args: ["--version"],
    short: pm === "npm",
  });

  const oxlintCheck = spawnSync(command, {
    encoding: "utf8",
    shell: true,
  });

  if (oxlintCheck.status === 0 && oxlintCheck.stdout) {
    return {
      message: `Oxlint is installed (${oxlintCheck.stdout.trim()})`,
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
const checkBiomeConfig = async (): Promise<DiagnosticCheck> => {
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
    const configContent = await readFile(configPath, "utf8");
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
const checkEslintConfig = async (): Promise<DiagnosticCheck> => {
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
    const configContent = await readFile(configPath, "utf8");

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

// Helper to generate the full node_modules path for oxlint configs
const getOxlintConfigPath = (name: string) =>
  `./node_modules/ultracite/config/oxlint/${name}/.oxlintrc.json`;

// Check if .oxlintrc.json exists and extends ultracite
const checkOxlintConfig = async (): Promise<DiagnosticCheck> => {
  const oxlintConfigPath = join(process.cwd(), ".oxlintrc.json");

  if (!existsSync(oxlintConfigPath)) {
    return {
      message: "No .oxlintrc.json file found (optional)",
      name: "Oxlint configuration",
      status: "warn",
    };
  }

  try {
    const configContent = await readFile(oxlintConfigPath, "utf8");
    const config = parse(configContent);

    if (
      Array.isArray(config?.extends) &&
      config.extends.includes(getOxlintConfigPath("core"))
    ) {
      return {
        message: ".oxlintrc.json extends ultracite oxlint config",
        name: "Oxlint configuration",
        status: "pass",
      };
    }

    return {
      message: ".oxlintrc.json exists but doesn't extend ultracite config",
      name: "Oxlint configuration",
      status: "warn",
    };
  } catch {
    return {
      message: "Could not parse .oxlintrc.json file",
      name: "Oxlint configuration",
      status: "fail",
    };
  }
};

// Check if Ultracite is in package.json
const checkUltraciteDependency = async (): Promise<DiagnosticCheck> => {
  const packageJsonPath = join(process.cwd(), "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      message: "No package.json found",
      name: "Ultracite dependency",
      status: "warn",
    };
  }

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
    const version =
      packageJson.dependencies?.ultracite ||
      packageJson.devDependencies?.ultracite ||
      packageJson.peerDependencies?.ultracite;

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

const runCheck = async (
  checkFn: () => DiagnosticCheck | Promise<DiagnosticCheck>,
  checkName: string
): Promise<DiagnosticCheck> => {
  const s = spinner();
  s.start(`Checking ${checkName}...`);

  const result = await checkFn();

  if (result.status === "pass") {
    s.stop(result.message);
  } else if (result.status === "warn") {
    s.stop(result.message);
  } else {
    s.stop(result.message);
  }

  return result;
};

// Main doctor function
export const doctor = async (): Promise<void> => {
  intro(`Ultracite v${packageJson.version} Doctor`);

  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";
  const command = dlxCommand(pm, "ultracite", {
    args: ["init"],
    short: pm === "npm",
  });

  const checks: DiagnosticCheck[] = [];

  // Run all checks with spinners
  checks.push(await runCheck(checkBiomeInstallation, "Biome installation"));
  checks.push(await runCheck(checkEslintInstallation, "ESLint installation"));
  checks.push(await runCheck(checkOxlintInstallation, "Oxlint installation"));
  checks.push(await runCheck(checkBiomeConfig, "Biome configuration"));
  checks.push(await runCheck(checkEslintConfig, "ESLint configuration"));
  checks.push(await runCheck(checkOxlintConfig, "Oxlint configuration"));
  checks.push(await runCheck(checkUltraciteDependency, "Ultracite dependency"));
  checks.push(await runCheck(checkConflictingTools, "conflicting tools"));

  // Calculate summary
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  // Log results with appropriate styling
  log.info(
    `Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`
  );

  if (failCount > 0) {
    log.error(`Some checks failed. Run '${command}' to fix issues.`);
    outro("Doctor complete");
    throw new Error("Doctor checks failed");
  }

  if (warnCount > 0) {
    log.warn(
      `Some optional improvements available. Run '${command}' to configure.`
    );
    outro("Doctor complete");
    return;
  }

  log.success("Everything looks good!");
  outro("Doctor complete");
};
