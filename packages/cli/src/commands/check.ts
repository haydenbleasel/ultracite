import { spawnSync } from "node:child_process";
import process from "node:process";
import { detectPackageManager, dlxCommand } from "nypm";
import { formatBiomeOutput } from "../reporter";
import { parseFilePaths } from "../utils";

type CheckOptions = [
  string[],
  {
    "diagnostic-level"?: "info" | "warn" | "error";
  },
];

export const check = async (opts: CheckOptions | undefined) => {
  const files = opts?.[0] || [];
  const diagnostic_level = opts?.[1]["diagnostic-level"];

  const args = ["check", "--no-errors-on-unmatched", "--reporter=json"];
  if (diagnostic_level) {
    args.push(`--diagnostic-level=${diagnostic_level}`);
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
  const { output, hasErrors } = formatBiomeOutput(stdout, "check");
  console.log(output);

  if (hasErrors) {
    throw new Error("Ultracite check completed with errors");
  }
};
