import { describe, expect, test } from "bun:test";

import { assertSuccessfulRun } from "../command";
import type { RunOutcome } from "../command";

describe("assertSuccessfulRun", () => {
  test("accepts a successful run", () => {
    const outcome: RunOutcome = {
      durationMs: 125,
      status: 0,
      stderr: "",
    };

    expect(() =>
      assertSuccessfulRun(outcome, "head/oxlint", "check")
    ).not.toThrow();
  });

  test("rejects a nonzero child status and includes stderr", () => {
    const outcome: RunOutcome = {
      durationMs: 125,
      status: 2,
      stderr: "Invalid configuration details",
    };

    expect(() => assertSuccessfulRun(outcome, "head/oxlint", "check")).toThrow(
      "head/oxlint check failed with status 2:\nInvalid configuration details"
    );
  });

  test("retains the setup failure pattern and stderr diagnostic", () => {
    const outcome: RunOutcome = {
      durationMs: 1,
      status: 1,
      stderr: "No linter configuration found in the project",
    };

    expect(() => assertSuccessfulRun(outcome, "base/biome", "fix")).toThrow(
      "base/biome fix failed with status 1 (No linter configuration found):\nNo linter configuration found in the project"
    );
  });

  test("rejects setup diagnostics even if the child exits successfully", () => {
    const outcome: RunOutcome = {
      durationMs: 1,
      status: 0,
      stderr: "Failed to run linter: executable not found",
    };

    expect(() => assertSuccessfulRun(outcome, "head/eslint", "check")).toThrow(
      "head/eslint check failed with status 0 (Failed to run):\nFailed to run linter: executable not found"
    );
  });
});
