import { spawnSync } from "node:child_process";
import process from "node:process";
import type { options } from "@ultracite/data/options";
import { detectPackageManager, dlxCommand } from "nypm";
import { parseFilePaths } from "../utils";

type Linter = (typeof options.linters)[number];

interface CheckOptions {
  "diagnostic-level"?: "info" | "warn" | "error";
  linter?: Linter;
}

const runBiomeCheck = async (
  files: string[],
  diagnosticLevel?: string
): Promise<{ hasErrors: boolean }> => {
  const args = ["check", "--no-errors-on-unmatched"];
  if (diagnosticLevel) {
    args.push(`--diagnostic-level=${diagnosticLevel}`);
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
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  return { hasErrors: result.status !== 0 };
};

const runOxlintCheck = async (
  files: string[]
): Promise<{ hasErrors: boolean }> => {
  const args = files.length > 0 ? parseFilePaths(files) : ["."];

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

export const check = async (
  opts: [string[], CheckOptions] | undefined
): Promise<{ hasErrors: boolean }> => {
  const files = opts?.[0] || [];
  const diagnosticLevel = opts?.[1]["diagnostic-level"];
  const linter = opts?.[1].linter || "biome";

  switch (linter) {
    case "eslint":
      return await runEslintCheck(files);
    case "oxlint":
      return await runOxlintCheck(files);
    default:
      return await runBiomeCheck(files, diagnosticLevel);
  }
};
