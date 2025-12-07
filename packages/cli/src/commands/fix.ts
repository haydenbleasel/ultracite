import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import { parseFilePaths } from "../utils";

type FixOptions = {
  unsafe?: boolean;
};

export const fix = async (files: string[], options: FixOptions = {}) => {
  const args = [
    "check",
    "--write",
    "--no-errors-on-unmatched",
    "--max-diagnostics=none",
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
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Ultracite fix failed with status ${result.status ?? 1}`);
  }
};
