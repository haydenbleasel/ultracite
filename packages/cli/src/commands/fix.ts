import { spawnSync } from "node:child_process";
import process from "node:process";
import { parseFilePaths } from "../utils";

type FixOptions = Record<string, unknown>;

export const fix = (files: string[], options: FixOptions = {}) => {
  const args = [
    "npx",
    "@biomejs/biome",
    "check",
    "--write",
    "--no-errors-on-unmatched",
  ];

  // Convert all flag options to command line arguments
  for (const [key, value] of Object.entries(options)) {
    if (value === true) {
      // Boolean flags like --unsafe
      args.push(`--${key}`);
    } else if (value !== false && value !== undefined) {
      // Flags with values like --diagnostic-level=error
      args.push(`--${key}=${String(value)}`);
    }
  }

  // Add files or default to current directory
  if (files.length > 0) {
    args.push(...parseFilePaths(files));
  } else {
    args.push("./");
  }

  const fullCommand = args.join(" ");

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
