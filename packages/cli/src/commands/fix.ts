import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectLinter, parseFilePaths, shellOption } from "../utils";

const runBiomeFix = (files: string[], passthrough: string[]): void => {
  const args = ["check", "--write", "--no-errors-on-unmatched", ...passthrough];

  if (files.length > 0) {
    args.push(...parseFilePaths(files));
  } else {
    args.push("./");
  }

  const result = spawnSync("biome", args, {
    stdio: "inherit",
    shell: shellOption,
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

  const result = spawnSync("eslint", args, {
    stdio: "inherit",
    shell: shellOption,
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

  const result = spawnSync("prettier", args, {
    stdio: "inherit",
    shell: shellOption,
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

  const result = spawnSync("stylelint", args, {
    stdio: "inherit",
    shell: shellOption,
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

  const result = spawnSync("oxlint", args, {
    stdio: "inherit",
    shell: shellOption,
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

  const result = spawnSync("oxfmt", args, {
    stdio: "inherit",
    shell: shellOption,
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
    default:
      await runBiomeFix(files, passthrough);
  }
};
