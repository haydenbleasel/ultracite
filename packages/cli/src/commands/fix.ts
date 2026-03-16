import { spawnSync } from "node:child_process";
import process from "node:process";

import { detectLinter, parseFilePaths } from "../utils";

const runCommand = (
  command: string,
  args: string[],
  options: Parameters<typeof spawnSync>[2]
) => {
  const result = spawnSync(command, args, options);
  const isMissingCommand =
    process.platform === "win32" &&
    result.error &&
    "code" in result.error &&
    result.error.code === "ENOENT";

  if (!isMissingCommand) {
    return result;
  }

  return spawnSync(`${command}.cmd`, args, options);
};

const runBiomeFix = (files: string[], passthrough: string[]): void => {
  const args = ["check", "--write", "--no-errors-on-unmatched", ...passthrough];

  if (files.length > 0) {
    args.push(...parseFilePaths(files));
  } else {
    args.push("./");
  }

  const result = runCommand("biome", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Biome: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runEslintFix = (files: string[], passthrough: string[]): void => {
  const args = [
    "--fix",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = runCommand("eslint", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run ESLint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runPrettierFix = (files: string[], passthrough: string[]): void => {
  const args = [
    "--write",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = runCommand("prettier", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Prettier: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runStylelintFix = (files: string[], passthrough: string[]): void => {
  const args = [
    "--fix",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = runCommand("stylelint", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Stylelint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxlintFix = (files: string[], passthrough: string[]): void => {
  // Check if --unsafe is in passthrough, use --fix-dangerously instead
  const hasUnsafe = passthrough.includes("--unsafe");
  const filteredPassthrough = passthrough.filter((arg) => arg !== "--unsafe");

  const args = [
    hasUnsafe ? "--fix-dangerously" : "--fix",
    ...filteredPassthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = runCommand("oxlint", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Oxlint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxfmtFix = (files: string[], passthrough: string[]): void => {
  const args = [
    "--write",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = runCommand("oxfmt", args, {
    stdio: "inherit",
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
      await runPrettierFix(files, []);
      await runEslintFix(files, passthrough);
      await runStylelintFix(files, []);
      break;
    }
    case "oxlint": {
      await runOxfmtFix(files, []);
      await runOxlintFix(files, passthrough);
      break;
    }
    default: {
      await runBiomeFix(files, passthrough);
    }
  }
};
