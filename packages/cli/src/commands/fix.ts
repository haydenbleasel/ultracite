import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import { detectLinter, parseFilePaths } from "../utils";

const runBiomeFix = async (
  files: string[],
  passthrough: string[]
): Promise<void> => {
  const args = ["check", "--write", "--no-errors-on-unmatched", ...passthrough];

  if (files.length > 0) {
    args.push(...parseFilePaths(files));
  } else {
    args.push("./");
  }

  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const fullCommand = dlxCommand(pm, "@biomejs/biome", {
    args,
    short: pm === "npm",
  });

  const result = spawnSync(fullCommand, {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run Biome: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runEslintFix = async (
  files: string[],
  passthrough: string[]
): Promise<void> => {
  const args = [
    "--fix",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const fullCommand = dlxCommand(pm, "eslint", {
    args,
    short: pm === "npm",
  });

  const result = spawnSync(fullCommand, {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run ESLint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runPrettierFix = async (
  files: string[],
  passthrough: string[]
): Promise<void> => {
  const args = [
    "--write",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const fullCommand = dlxCommand(pm, "prettier", {
    args,
    short: pm === "npm",
  });

  const result = spawnSync(fullCommand, {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run Prettier: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runStylelintFix = async (
  files: string[],
  passthrough: string[]
): Promise<void> => {
  const args = [
    "--fix",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const fullCommand = dlxCommand(pm, "stylelint", {
    args,
    short: pm === "npm",
  });

  const result = spawnSync(fullCommand, {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run Stylelint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxlintFix = async (
  files: string[],
  passthrough: string[]
): Promise<void> => {
  // Check if --unsafe is in passthrough, use --fix-dangerously instead
  const hasUnsafe = passthrough.includes("--unsafe");
  const filteredPassthrough = passthrough.filter((arg) => arg !== "--unsafe");

  const args = [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const fullCommand = dlxCommand(pm, "oxlint", {
    args,
    short: pm === "npm",
  });

  const result = spawnSync(fullCommand, {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run Oxlint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxfmtFix = async (
  files: string[],
  passthrough: string[]
): Promise<void> => {
  const args = [
    "--write",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const detected = await detectPackageManager(process.cwd());
  const pm = detected?.name || "npm";

  const fullCommand = dlxCommand(pm, "oxfmt", {
    args,
    short: pm === "npm",
  });

  const result = spawnSync(fullCommand, {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run oxfmt: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

export const fix = async (
  files: string[],
  passthrough: string[] = []
): Promise<void> => {
  const linter = await detectLinter();

  if (!linter) {
    throw new Error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
  }

  switch (linter) {
    case "eslint": {
      await runPrettierFix(files, passthrough);
      await runEslintFix(files, passthrough);
      await runStylelintFix(files, passthrough);
      break;
    }
    case "oxlint": {
      await runOxfmtFix(files, passthrough);
      await runOxlintFix(files, passthrough);
      break;
    }
    default:
      await runBiomeFix(files, passthrough);
  }
};
