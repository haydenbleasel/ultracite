import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import type { options } from "../consts/options";
import { parseFilePaths } from "../utils";

type Linter = (typeof options.linters)[number];

interface FixOptions {
  unsafe?: boolean;
  linter?: Linter;
}

const runBiomeFix = async (
  files: string[],
  unsafe?: boolean
): Promise<{ hasErrors: boolean }> => {
  const args = ["check", "--write", "--no-errors-on-unmatched"];

  if (unsafe) {
    args.push("--unsafe");
  }

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
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  return { hasErrors: result.status !== 0 };
};

const runEslintFix = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = ["--fix", ...(files.length > 0 ? parseFilePaths(files) : ["."])];

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
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  return { hasErrors: result.status !== 0 };
};

const runPrettierFix = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = [
    "--write",
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
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  return { hasErrors: result.status !== 0 };
};

const runOxlintFix = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = ["--fix", ...(files.length > 0 ? parseFilePaths(files) : ["."])];

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
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  return { hasErrors: result.status !== 0 };
};

export const fix = async (
  files: string[],
  opts: FixOptions = {}
): Promise<{ hasErrors: boolean }> => {
  const linter = opts.linter || "biome";

  switch (linter) {
    case "eslint": {
      // ESLint is only a linter, so we run Prettier for formatting first
      const prettierResult = await runPrettierFix(files);
      const eslintResult = await runEslintFix(files);
      return { hasErrors: prettierResult.hasErrors || eslintResult.hasErrors };
    }
    case "oxlint":
      return runOxlintFix(files);
    case "biome":
    default:
      return runBiomeFix(files, opts.unsafe);
  }
};
