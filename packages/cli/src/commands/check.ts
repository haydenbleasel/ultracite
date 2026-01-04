import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import { detectLinter, type Linter, parseFilePaths } from "../utils";

interface CheckOptions {
  "diagnostic-level"?: "info" | "warn" | "error";
  linter?: Linter;
  "type-aware"?: boolean;
  "type-check"?: boolean;
  "no-error-on-unmatched-pattern"?: boolean;
  "error-on-warnings"?: boolean;
}

const runBiomeCheck = async (
  files: string[],
  diagnosticLevel?: string,
  errorOnWarnings?: boolean
): Promise<{ hasErrors: boolean }> => {
  const args = ["check", "--no-errors-on-unmatched"];
  if (diagnosticLevel) {
    args.push(`--diagnostic-level=${diagnosticLevel}`);
  }

  if (errorOnWarnings) {
    args.push("--error-on-warnings");
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

const runEslintCheck = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = files.length > 0 ? parseFilePaths(files) : ["."];

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

const runPrettierCheck = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = [
    "--check",
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

const runStylelintCheck = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = files.length > 0 ? parseFilePaths(files) : ["."];

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

const runOxlintCheck = async (
  files: string[],
  typeAware?: boolean,
  typeCheck?: boolean
): Promise<{ hasErrors: boolean }> => {
  const args: string[] = [];

  if (typeAware) {
    args.push("--type-aware");
  }

  if (typeCheck) {
    args.push("--type-check");
  }

  args.push(...(files.length > 0 ? parseFilePaths(files) : ["."]));

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

const runOxfmtCheck = async (
  files: string[],
  noErrorOnUnmatchedPattern?: boolean
): Promise<{ hasErrors: boolean }> => {
  const args = ["--check"];

  if (noErrorOnUnmatchedPattern) {
    args.push("--no-error-on-unmatched-pattern");
  }

  args.push(...(files.length > 0 ? parseFilePaths(files) : ["."]));

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

export const check = async (
  opts: [string[], CheckOptions] | undefined
): Promise<{ hasErrors: boolean }> => {
  const files = opts?.[0] || [];
  const diagnosticLevel = opts?.[1]["diagnostic-level"];
  const explicitLinter = opts?.[1].linter;

  const linter = explicitLinter || (await detectLinter());

  if (!linter) {
    throw new Error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
  }

  switch (linter) {
    case "eslint": {
      const prettierResult = await runPrettierCheck(files);
      const eslintResult = await runEslintCheck(files);
      const stylelintResult = await runStylelintCheck(files);
      return {
        hasErrors:
          prettierResult.hasErrors ||
          eslintResult.hasErrors ||
          stylelintResult.hasErrors,
      };
    }
    case "oxlint": {
      const oxfmtResult = await runOxfmtCheck(
        files,
        opts?.[1]["no-error-on-unmatched-pattern"]
      );
      const oxlintResult = await runOxlintCheck(
        files,
        opts?.[1]["type-aware"],
        opts?.[1]["type-check"]
      );
      return { hasErrors: oxfmtResult.hasErrors || oxlintResult.hasErrors };
    }
    default:
      return runBiomeCheck(
        files,
        diagnosticLevel,
        opts?.[1]["error-on-warnings"]
      );
  }
};
