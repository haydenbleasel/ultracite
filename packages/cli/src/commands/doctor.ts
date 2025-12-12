import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { intro, log, outro, spinner } from "@clack/prompts";
import { parse } from "jsonc-parser";
import { detectPackageManager, dlxCommand } from "nypm";
import { eslintConfigFiles } from "../migrations/eslint";
import { prettierConfigFiles } from "../migrations/prettier";
import { title } from "../utils";

type DiagnosticCheck = {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
};

// Check if Biome is installed
const checkBiomeInstallation = async (): Promise<DiagnosticCheck> => {
  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const command = dlxCommand(pm, "@biomejs/biome", {
    args: ["--version"],
    short: pm === "npm",
  });

  const biomeCheck = spawnSync(command, {
    shell: true,
    encoding: "utf-8",
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
      status: "fail",
      message: "No biome.json or biome.jsonc file found",
    };
  }

  try {
    const configContent = await readFile(configPath, "utf-8");
    const config = parse(configContent);

    if (
      Array.isArray(config?.extends) &&
      config.extends.includes("ultracite/core")
    ) {
      return {
        name: "Biome configuration",
        status: "pass",
        message: "biome.json(c) extends ultracite/core",
      };
    }

    return {
      name: "Biome configuration",
      status: "warn",
      message: "biome.json(c) exists but doesn't extend ultracite/core",
    };
  } catch {
    return {
      name: "Biome configuration",
      status: "fail",
      message: "Could not parse biome.json(c) file",
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

  // Check for ESLint config files
  const hasEslint = eslintConfigFiles.some((file) =>
    existsSync(join(process.cwd(), file))
  );

  if (hasPrettier || hasEslint) {
    const conflicts: string[] = [];
    if (hasPrettier) {
      conflicts.push("Prettier");
    }
    if (hasEslint) {
      conflicts.push("ESLint");
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
  intro(title);

  const checks: DiagnosticCheck[] = [];

  // Run all checks with spinners
  checks.push(await runCheck(checkBiomeInstallation, "Biome installation"));
  checks.push(await runCheck(checkBiomeConfig, "Biome configuration"));
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
    log.error("Some checks failed. Run 'npx ultracite init' to fix issues.");
    outro("Doctor complete");
    throw new Error("Doctor checks failed");
  }

  if (warnCount > 0) {
    log.warn(
      "Some optional improvements available. Run 'npx ultracite init' to configure."
    );
    outro("Doctor complete");
    return;
  }

  log.success("Everything looks good!");
  outro("Doctor complete");
};
