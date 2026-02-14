import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { intro, log, outro, spinner } from "@clack/prompts";
import { parse } from "jsonc-parser";
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
const checkBiomeInstallation = (): DiagnosticCheck => {
  const biomeCheck = spawnSync("biome", ["--version"], {
    encoding: "utf-8",
    shell: true,
  });

  if (biomeCheck.status === 0 && biomeCheck.stdout) {
    return {
      name: "Biome installation",
      status: "pass",
      message: `Biome is installed (${biomeCheck.stdout.trim()})`,
    };
  }

  return {
    name: "Biome installation",
    status: "fail",
    message: "Biome is not installed or not accessible",
  };
};

// Check if ESLint is installed
const checkEslintInstallation = (): DiagnosticCheck => {
  const eslintCheck = spawnSync("eslint", ["--version"], {
    encoding: "utf-8",
    shell: true,
  });

  if (eslintCheck.status === 0 && eslintCheck.stdout) {
    return {
      name: "ESLint installation",
      status: "pass",
      message: `ESLint is installed (${eslintCheck.stdout.trim()})`,
    };
  }

  return {
    name: "ESLint installation",
    status: "warn",
    message: "ESLint is not installed (optional)",
  };
};

// Check if Oxlint is installed
const checkOxlintInstallation = (): DiagnosticCheck => {
  const oxlintCheck = spawnSync("oxlint", ["--version"], {
    encoding: "utf-8",
    shell: true,
  });

  if (oxlintCheck.status === 0 && oxlintCheck.stdout) {
    return {
      name: "Oxlint installation",
      status: "pass",
      message: `Oxlint is installed (${oxlintCheck.stdout.trim()})`,
    };
  }

  return {
    name: "Oxlint installation",
    status: "warn",
    message: "Oxlint is not installed (optional)",
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
      name: "Biome configuration",
      status: "warn",
      message: "No biome.json or biome.jsonc file found",
    };
  }

  try {
    const configContent = await readFile(configPath, "utf-8");
    const config = parse(configContent);

    if (
      Array.isArray(config?.extends) &&
      config.extends.includes("ultracite/biome/core")
    ) {
      return {
        name: "Biome configuration",
        status: "pass",
        message: "biome.json(c) extends ultracite/biome/core",
      };
    }

    return {
      name: "Biome configuration",
      status: "warn",
      message: "biome.json(c) exists but doesn't extend ultracite/biome/core",
    };
  } catch {
    return {
      name: "Biome configuration",
      status: "fail",
      message: "Could not parse biome.json(c) file",
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
      name: "ESLint configuration",
      status: "warn",
      message: "No eslint.config.* file found (optional)",
    };
  }

  try {
    const configContent = await readFile(configPath, "utf-8");

    if (configContent.includes("ultracite/eslint")) {
      return {
        name: "ESLint configuration",
        status: "pass",
        message: "eslint.config.* imports ultracite/eslint",
      };
    }

    return {
      name: "ESLint configuration",
      status: "warn",
      message: "eslint.config.* exists but doesn't import ultracite/eslint",
    };
  } catch {
    return {
      name: "ESLint configuration",
      status: "fail",
      message: "Could not read eslint.config.* file",
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
      name: "Oxlint configuration",
      status: "warn",
      message: "No .oxlintrc.json file found (optional)",
    };
  }

  try {
    const configContent = await readFile(oxlintConfigPath, "utf-8");
    const config = parse(configContent);

    if (
      Array.isArray(config?.extends) &&
      config.extends.includes(getOxlintConfigPath("core"))
    ) {
      return {
        name: "Oxlint configuration",
        status: "pass",
        message: ".oxlintrc.json extends ultracite oxlint config",
      };
    }

    return {
      name: "Oxlint configuration",
      status: "warn",
      message: ".oxlintrc.json exists but doesn't extend ultracite config",
    };
  } catch {
    return {
      name: "Oxlint configuration",
      status: "fail",
      message: "Could not parse .oxlintrc.json file",
    };
  }
};

// Check if Ultracite is in package.json
const checkUltraciteDependency = async (): Promise<DiagnosticCheck> => {
  const packageJsonPath = join(process.cwd(), "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      name: "Ultracite dependency",
      status: "warn",
      message: "No package.json found",
    };
  }

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    const version =
      packageJson.dependencies?.ultracite ||
      packageJson.devDependencies?.ultracite ||
      packageJson.peerDependencies?.ultracite;

    if (version) {
      return {
        name: "Ultracite dependency",
        status: "pass",
        message: `Ultracite is in package.json (${version})`,
      };
    }

    return {
      name: "Ultracite dependency",
      status: "warn",
      message: "Ultracite not found in package.json dependencies",
    };
  } catch {
    return {
      name: "Ultracite dependency",
      status: "warn",
      message: "Could not parse package.json",
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
      name: "Conflicting tools",
      status: "warn",
      message: `Found potentially conflicting tools: ${conflicts.join(", ")}`,
    };
  }

  return {
    name: "Conflicting tools",
    status: "pass",
    message: "No conflicting formatting/linting tools found",
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
