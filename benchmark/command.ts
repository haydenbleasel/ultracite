import type { Command } from "./config";

export interface RunOutcome {
  durationMs: number;
  status: number;
  stderr: string;
  stdout: string;
}

// The linter couldn't start (missing config, unresolved binary). Matched on
// stderr only: stdout carries lint output, including code frames quoted from
// the fixtures, which can contain any of these phrases.
const SETUP_FAILURE_PATTERNS = [
  "No linter configuration found",
  "Failed to run",
  "command not found",
  "Could not find",
  "Cannot find",
];

// The linter started but had nothing to lint. Oxlint and Oxfmt print these on
// either stream, and such a run would time as a meaningless fast result.
const NO_INPUT_PATTERNS = [
  "No files found to lint",
  "No files found matching the given patterns",
  "Expected at least one target file",
  "All matched files may have been excluded by ignore rules",
];

const findUnrunnableReason = (outcome: RunOutcome): string | undefined => {
  // A nonzero status with no output at all means the CLI never ran: a spawn
  // error or a killed process, both of which runCommand reports as status 1.
  if (
    outcome.status !== 0 &&
    !outcome.stdout.trim() &&
    !outcome.stderr.trim()
  ) {
    return "no output";
  }

  return (
    SETUP_FAILURE_PATTERNS.find((pattern) =>
      outcome.stderr.includes(pattern)
    ) ??
    NO_INPUT_PATTERNS.find(
      (pattern) =>
        outcome.stdout.includes(pattern) || outcome.stderr.includes(pattern)
    )
  );
};

// Lint diagnostics alone can produce a nonzero status, and those runs are
// still valid samples, so a nonzero status is only rejected without output.
export const assertRunnable = (
  outcome: RunOutcome,
  label: string,
  command: Command
): void => {
  const reason = findUnrunnableReason(outcome);
  if (reason) {
    const diagnostics = [outcome.stdout, outcome.stderr]
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `${label} ${command} could not run (status ${outcome.status}; ${reason}):\n${diagnostics}`
    );
  }
};
