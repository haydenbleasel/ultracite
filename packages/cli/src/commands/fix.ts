import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import { detectLinter, type Linter, parseFilePaths } from "../utils";

interface FixOptions {
  unsafe?: boolean;
  linter?: Linter;
  "type-aware"?: boolean;
  "type-check"?: boolean;
  "error-on-warnings"?: boolean;
}

const runBiomeFix = async (
  files: string[],
  unsafe?: boolean,
  errorOnWarnings?: boolean
): Promise<void> => {
  const args = ["check", "--write", "--no-errors-on-unmatched"];

  if (unsafe) {
    args.push("--unsafe");
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

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runEslintFix = async (files: string[]): Promise<void> => {
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

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runPrettierFix = async (files: string[]): Promise<void> => {
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

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runStylelintFix = async (files: string[]): Promise<void> => {
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

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxlintFix = async (
  files: string[],
  typeAware?: boolean,
  typeCheck?: boolean,
  unsafe?: boolean
): Promise<void> => {
  const args = [unsafe ? "--fix-dangerously" : "--fix"];

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

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runOxfmtFix = async (files: string[]): Promise<void> => {
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

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

export const fix = async (
  files: string[],
  opts: FixOptions = {}
): Promise<void> => {
  const linter = opts.linter || (await detectLinter());

  if (!linter) {
    throw new Error(
      "No linter configuration found. Run `ultracite init` to set up a linter."
    );
  }

  switch (linter) {
    case "eslint": {
      await runPrettierFix(files);
      await runEslintFix(files);
      await runStylelintFix(files);
      break;
    }
    case "oxlint": {
      await runOxfmtFix(files);
      await runOxlintFix(
        files,
        opts["type-aware"],
        opts["type-check"],
        opts.unsafe
      );
      break;
    }
    default:
      await runBiomeFix(files, opts.unsafe, opts["error-on-warnings"]);
  }
};
