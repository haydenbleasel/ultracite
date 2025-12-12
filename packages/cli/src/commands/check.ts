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
    maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large codebases
  });

  if (result.error) {
    throw new Error(`Failed to run Ultracite: ${result.error.message}`);
  }

  // Get stdout (JSON output) and stderr
  const stdout = result.stdout?.toString() || "";
  const stderr = result.stderr?.toString() || "";

  // Biome outputs JSON to stdout, but may output to stderr on certain errors
  // Use stdout if it looks like JSON, otherwise try stderr
  const jsonOutput = stdout.trim().startsWith("{") ? stdout : stderr;

  // Parse and format the output
  const { output, hasErrors } = formatBiomeOutput(jsonOutput, "check");
  console.log(output);

  return { hasErrors };
};
