import { spawnSync } from "node:child_process";
import process from "node:process";
import { parseFilePaths } from "../utils";

type CheckOptions = [string[], Record<string, unknown>];

export const check = (opts: CheckOptions | undefined) => {
  const files = opts?.[0] || [];
  const flags = opts?.[1] || {};

  const args = ["npx", "@biomejs/biome", "check", "--no-errors-on-unmatched"];

  // Convert all flag options to command line arguments
  for (const [key, value] of Object.entries(flags)) {
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
    console.error("Failed to run Ultracite:", result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};
