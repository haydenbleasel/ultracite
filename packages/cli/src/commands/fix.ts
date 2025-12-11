import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import { formatBiomeOutput } from "../reporter";
import { parseFilePaths } from "../utils";

type FixOptions = {
  unsafe?: boolean;
};

export const fix = async (files: string[], options: FixOptions = {}) => {
  const args = [
    "check",
    "--write",
    "--no-errors-on-unmatched",
    "--reporter=json",
  ];

  if (options.unsafe) {
    args.push("--unsafe");
  }

  // Add files or default to current directory
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
    stdio: "pipe",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  // Get stdout (JSON output) - stderr contains the warning about JSON being unstable
  const stdout = result.stdout?.toString() || "";

  // Parse and format the output
  const { output, hasErrors } = formatBiomeOutput(stdout, "fix");
  console.log(output);

  if (hasErrors) {
    throw new Error("Ultracite fix completed with errors");
  }
};
