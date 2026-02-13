import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectLinter, parseFilePaths } from "../utils";

const runBiomeCheck = (files: string[], passthrough: string[]): void => {
  const args = ["check", "--no-errors-on-unmatched", ...passthrough];

  if (files.length > 0) {
    args.push(...parseFilePaths(files));
  } else {
    args.push("./");
  }

  const result = spawnSync("biome", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Biome: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runEslintCheck = (files: string[], passthrough: string[]): void => {
  const args = [
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = spawnSync("eslint", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run ESLint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runPrettierCheck = (files: string[], passthrough: string[]): void => {
  const args = [
    "--check",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = spawnSync("prettier", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Prettier: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runStylelintCheck = (files: string[], passthrough: string[]): void => {
  const args = [
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = spawnSync("stylelint", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Stylelint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxlintCheck = (files: string[], passthrough: string[]): void => {
  const args = [
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = spawnSync("oxlint", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run Oxlint: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxfmtCheck = (files: string[], passthrough: string[]): void => {
  const args = [
    "--check",
    ...passthrough,
    ...(files.length > 0 ? parseFilePaths(files) : ["."]),
  ];

  const result = spawnSync("oxfmt", args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run oxfmt: ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

export const check = async (
  files: string[] = [],
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
      await runPrettierCheck(files, []);
      await runEslintCheck(files, passthrough);
      await runStylelintCheck(files, []);
      break;
    }
    case "oxlint": {
      await runOxfmtCheck(files, []);
      await runOxlintCheck(files, passthrough);
      break;
    }
    default:
      await runBiomeCheck(files, passthrough);
  }
};
