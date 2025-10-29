import { spawnSync } from "node:child_process";
import process from "node:process";
import { parseFilePaths } from "../utils";

type CheckOptions = [
  string[],
  {
    "diagnostic-level"?: "info" | "warn" | "error";
  },
];

export const check = (opts: CheckOptions | undefined) => {
  const files = opts?.[0] || [];
  const diagnostic_level = opts?.[1]["diagnostic-level"];

  const args = ["npx", "@biomejs/biome", "check", "--no-errors-on-unmatched"];
  if (diagnostic_level) {
    args.push(`--diagnostic-level=${diagnostic_level}`);
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
