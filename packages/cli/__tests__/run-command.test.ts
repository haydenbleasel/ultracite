import { describe, expect, test } from "bun:test";

import { UltraciteSetupError } from "../src/config-resolution";
import {
  exitOnCommandFailure,
  LinterExitError,
  runSteps,
} from "../src/run-command";

describe("exitOnCommandFailure", () => {
  test("reports a tool that isn't installed as a setup error", () => {
    expect(() =>
      exitOnCommandFailure("oxfmt", {
        error: new Error("Command failed with ENOENT: oxfmt --check ."),
        errorCode: "ENOENT",
        status: null,
      })
    ).toThrow(
      new UltraciteSetupError(
        "oxfmt isn't installed in this project. Install it (`ultracite doctor` checks the setup) and try again."
      )
    );
  });

  test("reports other spawn failures as setup errors", () => {
    expect(() =>
      exitOnCommandFailure("Biome", {
        error: new Error("spawn EACCES"),
        status: null,
      })
    ).toThrow(UltraciteSetupError);
  });

  test("carries a linter's exit code", () => {
    expect(() => exitOnCommandFailure("ESLint", { status: 2 })).toThrow(
      new LinterExitError("ESLint", 2)
    );
  });
});

describe("runSteps", () => {
  test("runs every step after a missing tool, then reports it", () => {
    const ran: string[] = [];

    expect(() =>
      runSteps([
        () => {
          ran.push("prettier");
          throw new UltraciteSetupError("Prettier isn't installed");
        },
        () => {
          ran.push("eslint");
          throw new LinterExitError("ESLint", 1);
        },
        () => {
          ran.push("stylelint");
        },
      ])
    ).toThrow("Prettier isn't installed");
    expect(ran).toEqual(["prettier", "eslint", "stylelint"]);
  });

  test("rethrows the first linter failure with its exit code", () => {
    try {
      runSteps([
        () => {
          throw new LinterExitError("oxfmt", 1);
        },
        () => {
          throw new LinterExitError("Oxlint", 2);
        },
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(LinterExitError);
      expect(error instanceof LinterExitError && error.exitCode).toBe(1);
      return;
    }
    throw new Error("runSteps did not throw");
  });
});
