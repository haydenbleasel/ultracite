import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import { detectLinter, type Linter, parseFilePaths } from "../utils";

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
    throw new Error(`Failed to run Biome: ${result.error.message}`);
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
    throw new Error(`Failed to run ESLint: ${result.error.message}`);
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
    throw new Error(`Failed to run Prettier: ${result.error.message}`);
  }

  return { hasErrors: result.status !== 0 };
};

const runStylelintFix = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = ["--fix", ...(files.length > 0 ? parseFilePaths(files) : ["."])];

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
    throw new Error(`Failed to run Oxlint: ${result.error.message}`);
  }

  return { hasErrors: result.status !== 0 };
};

const runOxfmtFix = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = [
    "--write",
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

  return { hasErrors: result.status !== 0 };
};

export const fix = async (
  files: string[],
  opts: FixOptions = {}
): Promise<{ hasErrors: boolean }> => {
  const linter = opts.linter || (await detectLinter());

  if (!linter) {
    throw new Error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
  }

  switch (linter) {
    case "eslint": {
      const prettierResult = await runPrettierFix(files);
      const eslintResult = await runEslintFix(files);
      const stylelintResult = await runStylelintFix(files);
      return {
        hasErrors:
          prettierResult.hasErrors ||
          eslintResult.hasErrors ||
          stylelintResult.hasErrors,
      };
    }
    case "oxlint": {
      const oxfmtResult = await runOxfmtFix(files);
      const oxlintResult = await runOxlintFix(files);
      return { hasErrors: oxfmtResult.hasErrors || oxlintResult.hasErrors };
    }
    default:
      return runBiomeFix(files, opts.unsafe);
  }
};
