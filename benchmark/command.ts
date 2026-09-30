import type { Command } from "./config";

export interface RunOutcome {
  durationMs: number;
  status: number;
  stderr: string;
}

// A run that couldn't even start the linter (missing config, unresolved
// binary) returns near-instantly and would poison the numbers, so treat these
// as setup failures rather than fast results.
const FATAL_PATTERNS = [
  "No linter configuration found",
  "Failed to run",
  "command not found",
  "Could not find",
  "Cannot find",
];

export const assertSuccessfulRun = (
  outcome: RunOutcome,
  label: string,
  command: Command
): void => {
  const fatal = FATAL_PATTERNS.find((pattern) =>
    outcome.stderr.includes(pattern)
  );
  if (outcome.status !== 0 || fatal) {
    const reason = fatal ? ` (${fatal})` : "";
    throw new Error(
      `${label} ${command} failed with status ${outcome.status}${reason}:\n${outcome.stderr}`
    );
  }
};
