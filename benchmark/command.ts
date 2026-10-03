import type { Command } from "./config";

export interface RunOutcome {
  durationMs: number;
  status: number;
  stderr: string;
  stdout: string;
}

// These indicate setup failures or no lintable input, not a useful run. Lint
// diagnostics themselves can produce a nonzero status and are still timed.
const UNRUNNABLE_PATTERNS = [
  "No linter configuration found",
  "Failed to run",
  "command not found",
  "Could not find",
  "Cannot find",
  "No files found to lint",
  "No files found matching the given patterns",
  "Expected at least one target file",
  "All matched files may have been excluded by ignore rules",
];

export const assertRunnable = (
  outcome: RunOutcome,
  label: string,
  command: Command
): void => {
  const diagnostics = [outcome.stdout, outcome.stderr]
    .filter(Boolean)
    .join("\n");
  const loweredDiagnostics = diagnostics.toLowerCase();
  const unrunnable = UNRUNNABLE_PATTERNS.find((pattern) =>
    loweredDiagnostics.includes(pattern.toLowerCase())
  );
  if (unrunnable) {
    throw new Error(
      `${label} ${command} could not run (status ${outcome.status}; ${unrunnable}):\n${diagnostics}`
    );
  }
};
