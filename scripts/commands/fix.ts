import { spawnSync } from "node:child_process";
import process from "node:process";
import { parseFilePaths } from "../utils";

type FixOptions = {
  unsafe?: boolean;
};

export const fix = (files: string[], options: FixOptions = {}) => {
  const args = ["npx", "@biomejs/biome", "check", "--write"];

  if (options.unsafe) {
    args.push("--unsafe");
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
