import { describe, expect, test } from "bun:test";

import { assertRunnable } from "../command";
import type { RunOutcome } from "../command";

describe("assertRunnable", () => {
  test("accepts a run with no diagnostics", () => {
    const outcome: RunOutcome = {
      durationMs: 125,
      status: 0,
      stderr: "",
      stdout: "",
    };

    expect(() => assertRunnable(outcome, "head/oxlint", "check")).not.toThrow();
  });

  test("accepts nonzero status when the linter reports ordinary diagnostics", () => {
    const outcome: RunOutcome = {
      durationMs: 125,
      status: 1,
      stderr: "",
      stdout: "src/example.ts:1:1: Unexpected console statement",
    };

    expect(() => assertRunnable(outcome, "head/oxlint", "check")).not.toThrow();
  });

  test.each([
    [
      "missing linter config",
      "No linter configuration found in the project",
      "stderr",
    ],
    ["unresolved command", "command not found: oxlint", "stderr"],
    ["unresolved binary", "Cannot find module 'oxlint'", "stderr"],
    ["unresolved path", "Could not find oxlint binary", "stderr"],
    [
      "Oxlint no-files output",
      "No files found to lint. Please check your paths and ignore patterns.",
      "stdout",
    ],
    [
      "Oxlint pattern no-files output",
      "No files found matching the given patterns.",
      "stderr",
    ],
    ["Oxfmt no-files output", "Expected at least one target file.", "stdout"],
    [
      "Oxfmt ignored-files output",
      "All matched files may have been excluded by ignore rules.",
      "stderr",
    ],
  ])("rejects %s diagnostics from %s", (_name, message, stream) => {
    const outcome: RunOutcome = {
      durationMs: 1,
      status: 1,
      stderr: stream === "stderr" ? message : "",
      stdout: stream === "stdout" ? message : "",
    };

    expect(() => assertRunnable(outcome, "head/oxlint", "check")).toThrow(
      message
    );
  });

  test("rejects setup diagnostics from stderr even if the child exits successfully", () => {
    const outcome: RunOutcome = {
      durationMs: 1,
      status: 0,
      stderr: "Failed to run linter: executable not found",
      stdout: "",
    };

    expect(() => assertRunnable(outcome, "head/eslint", "check")).toThrow(
      "head/eslint check could not run (status 0; Failed to run):\nFailed to run linter: executable not found"
    );
  });

  test.each([
    ["no output", ""],
    ["whitespace-only output", "\n  \n"],
  ])("rejects nonzero status with %s", (_name, output) => {
    const outcome: RunOutcome = {
      durationMs: 1,
      status: 1,
      stderr: output,
      stdout: output,
    };

    expect(() => assertRunnable(outcome, "head/oxlint", "check")).toThrow(
      "head/oxlint check could not run (status 1; no output)"
    );
  });

  test("rejects a child that failed to start", () => {
    const outcome: RunOutcome = {
      durationMs: 1,
      error: new Error("spawnSync node ENOENT"),
      signal: null,
      status: 1,
      stderr: "",
      stdout: "",
    };

    expect(() => assertRunnable(outcome, "head/oxlint", "check")).toThrow(
      "head/oxlint check could not run (status 1; process error: spawnSync node ENOENT)"
    );
  });

  test("rejects a killed child even after it printed lint output", () => {
    const outcome: RunOutcome = {
      durationMs: 80,
      signal: "SIGTERM",
      status: 1,
      stderr: "",
      stdout: "src/example.ts:1:1: Unexpected console statement",
    };

    expect(() => assertRunnable(outcome, "head/oxlint", "check")).toThrow(
      "head/oxlint check could not run (status 1; killed by SIGTERM)"
    );
  });

  test("accepts setup-failure wording quoted in lint output on stdout", () => {
    const outcome: RunOutcome = {
      durationMs: 125,
      status: 1,
      stderr: "",
      stdout: [
        "src/api.ts:12:3: Unexpected console statement",
        '  12 |   throw new Error("Could not find user");',
      ].join("\n"),
    };

    expect(() => assertRunnable(outcome, "head/oxlint", "check")).not.toThrow();
  });
});
